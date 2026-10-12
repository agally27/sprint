import type { Day, Millis, Mission, Milestone, Sprint, Timeframe } from "../domain/types";
import { newId } from "../domain/ids";
import { addDays, daysUntil, formatMinutes, toDay } from "../domain/time";
import { parseGoal } from "./parseGoal";
import { TEMPLATES, type Template, type TemplateSprint } from "./templates";
import type { Archetype, DraftMilestone, DraftSprint, PlanDraft, PlanRequest } from "./types";

/** Sustainable focused minutes per day the planner assumes when fitting a plan. */
const DAILY_BUDGET_MIN = 75;

export const DEFAULT_HORIZON_DAYS: Record<Timeframe, number> = {
  today: 1,
  week: 7,
  month: 30,
  custom: 30,
  long_term: 90,
};

export function horizonDays(timeframe: Timeframe, deadline: Millis | undefined, now: Millis): number {
  if (deadline !== undefined) return Math.max(1, daysUntil(deadline, now));
  return DEFAULT_HORIZON_DAYS[timeframe];
}

function toDraftSprint(t: TemplateSprint): DraftSprint {
  const d: DraftSprint = { title: t.t, durationMin: t.m, energy: t.e };
  if (t.d) d.detail = t.d;
  return d;
}

interface Scaled {
  milestones: DraftMilestone[];
  compressed: boolean;
  totalMin: number;
}

/** Fits the template to the time available by dropping optional sprints first. */
function scale(template: Template, horizon: number): Scaled {
  const budget = horizon * DAILY_BUDGET_MIN;
  const all = template.milestones.map((m) => ({ title: m.title, sprints: [...m.sprints] }));
  const total = (ms: typeof all) => ms.reduce((acc, m) => acc + m.sprints.reduce((a, s) => a + s.m, 0), 0);

  let compressed = false;
  if (total(all) > budget) {
    compressed = true;
    // Drop non-core sprints from the end of the plan backwards until it fits.
    for (let mi = all.length - 1; mi >= 0 && total(all) > budget; mi--) {
      const m = all[mi];
      if (!m) continue;
      for (let si = m.sprints.length - 1; si >= 0 && total(all) > budget; si--) {
        if (!m.sprints[si]?.core) m.sprints.splice(si, 1);
      }
    }
  }
  if (horizon <= 1) {
    // A single day: keep only the essentials, and shorten long ones.
    for (const m of all) {
      m.sprints = m.sprints.filter((sp) => sp.core).map((sp) => ({ ...sp, m: Math.min(sp.m, 45) }));
    }
    compressed = true;
  }
  const milestones = all
    .filter((m) => m.sprints.length > 0)
    .map((m) => ({ title: m.title, sprints: m.sprints.map(toDraftSprint) }));
  return { milestones, compressed, totalMin: total(all) };
}

function typicalDuration(milestones: DraftMilestone[]): number {
  const durations = milestones.flatMap((m) => m.sprints.map((s) => s.durationMin)).sort((a, b) => a - b);
  return durations[Math.floor(durations.length / 2)] ?? 25;
}

function describeHorizon(days: number): string {
  if (days <= 1) return "today";
  if (days <= 2) return "tomorrow";
  if (days < 7) return `${days - 1} days away`;
  const weeks = Math.round(days / 7);
  if (days < 42) return `${weeks} week${weeks === 1 ? "" : "s"} away`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} away`;
}

export function explain(opts: {
  milestones: DraftMilestone[];
  horizon: number;
  hasDeadline: boolean;
  compressed: boolean;
  timeframe: Timeframe;
}): string {
  const { milestones, horizon, hasDeadline, compressed, timeframe } = opts;
  const n = milestones.reduce((a, m) => a + m.sprints.length, 0);
  const total = milestones.reduce((a, m) => a + m.sprints.reduce((x, s) => x + s.durationMin, 0), 0);
  const typical = typicalDuration(milestones);
  const k = milestones.length;
  if (horizon <= 1) {
    return `Your deadline is today, so I've kept this to the ${n} essential sprint${n === 1 ? "" : "s"}: about ${formatMinutes(total)} of focused work.`;
  }
  if (compressed && hasDeadline) {
    return `Your deadline is ${describeHorizon(horizon)}, so I've kept this to the ${n} sprints that matter most: about ${formatMinutes(total)} in total.`;
  }
  if (hasDeadline) {
    return `I've broken this into ${k} milestones and ${n} sprints because your deadline is ${describeHorizon(horizon)}. Most sprints are ${typical} minutes, so each one is easy to start.`;
  }
  if (timeframe === "long_term") {
    return `No deadline, so I've spaced ${n} sprints across ${k} milestones at a sustainable pace. Most are ${typical} minutes. You can speed up any time.`;
  }
  return `I've broken this into ${k} milestones and ${n} short sprints so you can start without any more planning. Most are ${typical} minutes.`;
}

function resolveTemplate(archetype: Archetype, answer: string | undefined): Template {
  if (answer && answer in TEMPLATES) return TEMPLATES[answer as Archetype];
  return TEMPLATES[archetype];
}

/**
 * Local planner. Deterministic, instant, and good enough that the product
 * works end to end with no AI provider at all.
 */
export function planLocal(req: PlanRequest): PlanDraft {
  const parsed = parseGoal(req.goalText, req.now);
  const template = resolveTemplate(parsed.archetype, req.clarificationAnswer);
  const deadline = parsed.deadline ?? req.deadline;
  const timeframe: Timeframe = parsed.deadline
    ? (parsed.timeframeHint ?? "custom")
    : req.deadline !== undefined
      ? "custom"
      : (req.timeframe ?? "month");
  const horizon = horizonDays(timeframe, deadline, req.now);
  const { milestones, compressed } = scale(template, horizon);

  const draft: PlanDraft = {
    title: template.title(parsed.objective),
    objective: parsed.objective,
    category: template.category,
    timeframe,
    explanation: explain({ milestones, horizon, hasDeadline: deadline !== undefined, compressed, timeframe }),
    milestones,
    source: "local",
  };
  if (deadline !== undefined) draft.deadline = deadline;
  if (template.clarification && !req.clarificationAnswer) draft.clarification = template.clarification;
  return draft;
}

export interface MaterializedPlan {
  mission: Mission;
  milestones: Milestone[];
  sprints: Sprint[];
}

/**
 * Spreads sprints over the horizon so each day has a realistic amount of work.
 * Starts today. Keeps mission order. Never schedules past the deadline.
 */
export function scheduleSprints(sprints: Sprint[], horizon: number, now: Millis): Sprint[] {
  const today = toDay(now);
  const n = sprints.length;
  if (n === 0) return sprints;
  const days = Math.max(1, horizon);
  const totalMin = sprints.reduce((a, s) => a + s.durationMin, 0);
  // Pace: minutes per day we'd like, bounded to something sustainable.
  const perDay = Math.max(25, Math.min(DAILY_BUDGET_MIN, totalMin / days));
  const usableDays = Math.min(days, Math.max(1, Math.ceil(totalMin / perDay)));
  // Spread across usableDays, but when the horizon is much longer than needed,
  // stretch to roughly every other day so progress stays visible without pressure.
  const span = days > usableDays * 2 ? Math.min(days, usableDays * 2) : usableDays;

  let dayCursor = 0;
  let minutesToday = 0;
  const out: Sprint[] = [];
  const perDayBudget = Math.max(perDay, Math.max(...sprints.map((s) => s.durationMin)));
  for (let i = 0; i < n; i++) {
    const s = sprints[i]!;
    if (minutesToday > 0 && minutesToday + s.durationMin > perDayBudget) {
      dayCursor += span > usableDays ? 2 : 1;
      minutesToday = 0;
    }
    const day: Day = addDays(today, Math.min(dayCursor, days - 1));
    out.push({ ...s, scheduledFor: day });
    minutesToday += s.durationMin;
  }
  return out;
}

export function materializePlan(draft: PlanDraft, goalId: string, now: Millis, opts: { priority?: 1 | 2 | 3 } = {}): MaterializedPlan {
  const missionId = newId("msn");
  const mission: Mission = {
    id: missionId,
    goalId,
    title: draft.title,
    objective: draft.objective,
    category: draft.category,
    status: "active",
    priority: opts.priority ?? 2,
    timeframe: draft.timeframe,
    explanation: draft.explanation,
    planSource: draft.source === "ai" ? "ai" : "local",
    createdAt: now,
    updatedAt: now,
  };
  if (draft.deadline !== undefined) mission.deadline = draft.deadline;

  const milestones: Milestone[] = [];
  const sprints: Sprint[] = [];
  let order = 0;
  draft.milestones.forEach((dm, mi) => {
    const milestone: Milestone = {
      id: newId("mls"),
      missionId,
      title: dm.title,
      order: mi,
      status: mi === 0 ? "active" : "pending",
    };
    milestones.push(milestone);
    for (const ds of dm.sprints) {
      const sprint: Sprint = {
        id: newId("spr"),
        missionId,
        milestoneId: milestone.id,
        title: ds.title,
        durationMin: ds.durationMin,
        order: order++,
        status: "planned",
        energy: ds.energy,
      };
      if (ds.detail) sprint.detail = ds.detail;
      sprints.push(sprint);
    }
  });

  const horizon = horizonDays(draft.timeframe, draft.deadline, now);
  return { mission, milestones, sprints: scheduleSprints(sprints, horizon, now) };
}
