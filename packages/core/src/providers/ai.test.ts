import { describe, expect, it } from "vitest";
import { LocalAIProvider, RemoteAIProvider, isPlanDraft } from "./ai";

const NOW = new Date(2026, 9, 7, 10, 0).getTime();

describe("AI providers", () => {
  it("local provider always plans", async () => {
    const plan = await new LocalAIProvider().planMission({ goalText: "Write my book", timeframe: "month", now: NOW });
    expect(isPlanDraft(plan)).toBe(true);
    expect(plan.source).toBe("local");
  });

  it("remote provider falls back to local when the network fails", async () => {
    const failing: typeof fetch = async () => {
      throw new Error("offline");
    };
    const remote = new RemoteAIProvider({ baseUrl: "https://api.example.invalid", fetchImpl: failing, timeoutMs: 500 });
    const plan = await remote.planMission({ goalText: "Run a 10K", timeframe: "long_term", now: NOW });
    expect(plan.source).toBe("local");
    expect(plan.title).toBe("Run a 10K");
  });

  it("remote provider falls back on bad shapes and HTTP errors", async () => {
    const bad: typeof fetch = async () => new Response(JSON.stringify({ nope: true }), { status: 200, headers: { "content-type": "application/json" } });
    const plan = await new RemoteAIProvider({ baseUrl: "https://x", fetchImpl: bad }).planMission({ goalText: "Learn Spanish", now: NOW });
    expect(plan.source).toBe("local");
    const err: typeof fetch = async () => new Response("nope", { status: 500 });
    const plan2 = await new RemoteAIProvider({ baseUrl: "https://x", fetchImpl: err }).planMission({ goalText: "Learn Spanish", now: NOW });
    expect(plan2.source).toBe("local");
  });

  it("remote provider uses a good response and marks it as ai", async () => {
    const good: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          title: "Ship It",
          objective: "Ship the thing",
          category: "work",
          timeframe: "week",
          explanation: "Two milestones because it's small.",
          milestones: [{ title: "Do", sprints: [{ title: "Start", durationMin: 15, energy: "focused" }] }, { title: "Finish", sprints: [{ title: "Wrap", durationMin: 10, energy: "light" }] }],
          source: "ai",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const plan = await new RemoteAIProvider({ baseUrl: "https://x", fetchImpl: good }).planMission({ goalText: "Ship the thing", now: NOW });
    expect(plan.source).toBe("ai");
    expect(plan.title).toBe("Ship It");
  });
});
