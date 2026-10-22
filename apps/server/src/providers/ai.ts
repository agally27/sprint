// Named imports on purpose: the SDK's default export is typed differently under
// ESM and CommonJS resolution, and Vercel's TypeScript sees the CommonJS shape.
import { Anthropic, APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { horizonDays, parseGoal, planLocal, type PlanDraft } from "@sprint/core";
import { ModelPlanSchema, type PlanRequestInput } from "../schemas";
import type { Env } from "../env";

/**
 * Server-side AI providers. The interface is identical to the client's
 * expectations (a PlanDraft), so the app cannot tell where a plan came from.
 */
export interface ServerAIProvider {
  readonly name: string;
  plan(req: PlanRequestInput): Promise<PlanDraft>;
  reflect(input: { sprintsCompleted: number; focusedMinutes: number; missions: Array<{ title: string; progress: number; completed: boolean }>; activeDays: number }): Promise<string>;
}

/** Deterministic planner from @sprint/core. Always available. */
export class LocalServerAIProvider implements ServerAIProvider {
  readonly name = "local";
  async plan(req: PlanRequestInput): Promise<PlanDraft> {
    return planLocal(req);
  }
  async reflect(input: { sprintsCompleted: number; focusedMinutes: number; missions: Array<{ title: string; progress: number; completed: boolean }>; activeDays: number }): Promise<string> {
    const top = [...input.missions].sort((a, b) => b.progress - a.progress)[0];
    if (input.sprintsCompleted === 0) return "A quiet week. One short sprint is enough to get moving again.";
    return `You completed ${input.sprintsCompleted} sprints this week${top ? ` and moved ${top.title} to ${Math.round(top.progress * 100)}%` : ""}.`;
  }
}

const SYSTEM_PROMPT = `You are the planning engine inside Sprint, a personal momentum app. Sprint turns a goal into a mission made of milestones and short, focused sprints.

Principles:
- The user should be able to start the first sprint within a minute of reading the plan. Every sprint title is a concrete action someone can begin immediately ("Write the hero headline", not "Marketing").
- Sprints are 5 to 90 minutes. Most are 15 to 45. Anything bigger is split. Never produce a single giant task.
- Use 3 to 6 milestones that read as stages (e.g. Foundation, Design, Build, Testing, Launch). Each milestone has 1 to 8 sprints.
- Respect the time available: a goal due today gets only the essentials; a long-term goal gets a sustainable, spread-out plan.
- Match energy to the work: "light" for admin and quick wins, "focused" for normal work, "deep" for writing, building, studying.
- Explain the plan in one or two short sentences, e.g. "I've broken this into four milestones because your deadline is four weeks away." No jargon, no hype.
- Never use guilt, pressure, or productivity shame. No exclamation marks.
- Ask one clarifying question only when the goal is genuinely ambiguous in a way that changes the plan (e.g. "get fit" could mean running, strength, or general fitness). Still return a reasonable plan alongside the question.
- The title is a short, motivating mission name in Title Case, at most six words. Keep the user's own wording for the objective.
- Choose the category that fits best.`;

export class AnthropicAIProvider implements ServerAIProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  private readonly fallback = new LocalServerAIProvider();

  constructor(private readonly env: Env) {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 28_000, maxRetries: 1 });
  }

  async plan(req: PlanRequestInput): Promise<PlanDraft> {
    const parsed = parseGoal(req.goalText, req.now);
    const deadline = parsed.deadline ?? req.deadline;
    const timeframe = parsed.deadline ? (parsed.timeframeHint ?? "custom") : req.deadline !== undefined ? "custom" : (req.timeframe ?? "month");
    const horizon = horizonDays(timeframe, deadline, req.now);
    const dateLine = deadline !== undefined ? `Deadline: ${new Date(deadline).toDateString()} (${horizon} days from today).` : `No fixed deadline. Timeframe: ${timeframe.replace("_", " ")} (about ${horizon} days).`;

    const user = [
      `Goal: "${req.goalText}"`,
      `Today: ${new Date(req.now).toDateString()}.`,
      dateLine,
      req.clarificationAnswer ? `The user answered the clarifying question with: "${req.clarificationAnswer}". Do not ask again.` : "",
      `Suggested category: ${parsed.category}. Detected type: ${parsed.archetype}.`,
      "Return the plan.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await this.client.messages.parse({
        model: this.env.ANTHROPIC_MODEL,
        max_tokens: 16000,
        output_config: { effort: "medium", format: zodOutputFormat(ModelPlanSchema) },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        return this.fallback.plan(req);
      }
      const model = response.parsed_output;
      const draft: PlanDraft = {
        title: model.title,
        objective: model.objective,
        category: model.category,
        timeframe,
        explanation: model.explanation,
        milestones: model.milestones.map((m) => ({
          title: m.title,
          sprints: m.sprints.map((s) => {
            const sprint: PlanDraft["milestones"][number]["sprints"][number] = { title: s.title, durationMin: s.durationMin, energy: s.energy };
            if (s.detail) sprint.detail = s.detail;
            return sprint;
          }),
        })),
        source: "ai",
      };
      if (deadline !== undefined) draft.deadline = deadline;
      if (model.clarification && !req.clarificationAnswer) draft.clarification = model.clarification;
      return draft;
    } catch (error) {
      // Rate limits, outages, bad keys: the product keeps working on the local planner.
      if (error instanceof APIError) {
        console.warn(`[ai] anthropic ${error.status ?? "error"}: ${error.name}`);
      } else {
        console.warn("[ai] anthropic request failed");
      }
      return this.fallback.plan(req);
    }
  }

  async reflect(input: { sprintsCompleted: number; focusedMinutes: number; missions: Array<{ title: string; progress: number; completed: boolean }>; activeDays: number }): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.env.ANTHROPIC_MODEL,
        max_tokens: 400,
        output_config: { effort: "low" },
        system: "You write one calm, specific sentence (max 30 words) reflecting on a person's week of focused work for the Sprint app. No guilt, no hype, no exclamation marks. Mention the most progressed mission by name.",
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });
      if (response.stop_reason === "refusal") return this.fallback.reflect(input);
      const text = response.content.find((b) => b.type === "text");
      return text?.text.trim() || (await this.fallback.reflect(input));
    } catch {
      return this.fallback.reflect(input);
    }
  }
}

export function createAIProvider(env: Env): ServerAIProvider {
  return env.ANTHROPIC_API_KEY ? new AnthropicAIProvider(env) : new LocalServerAIProvider();
}
