import { describe, expect, it } from "vitest";
import { materializePlan, planLocal, scheduleSprints } from "./planner";
import { toDay } from "../domain/time";

const NOW = new Date(2026, 9, 7, 10, 0, 0).getTime();

describe("planLocal", () => {
  it("creates a multi-milestone plan for a website with a deadline", () => {
    const plan = planLocal({ goalText: "I want to launch my website by Christmas", now: NOW });
    expect(plan.title).toBe("Launch My Website");
    expect(plan.milestones.length).toBeGreaterThanOrEqual(4);
    const sprints = plan.milestones.flatMap((m) => m.sprints);
    expect(sprints.length).toBeGreaterThanOrEqual(10);
    expect(Math.max(...sprints.map((s) => s.durationMin))).toBeLessThanOrEqual(90);
    expect(plan.explanation).toMatch(/milestones/);
    expect(plan.deadline).toBeDefined();
    expect(plan.source).toBe("local");
  });

  it("asks one clarifying question for ambiguous fitness goals", () => {
    const plan = planLocal({ goalText: "I want to get fit", now: NOW, timeframe: "month" });
    expect(plan.clarification?.options.map((o) => o.value)).toEqual(["running", "strength", "fitness"]);
    const refined = planLocal({ goalText: "I want to get fit", now: NOW, timeframe: "month", clarificationAnswer: "running" });
    expect(refined.clarification).toBeUndefined();
    expect(refined.title).toBe("Get Running");
  });

  it("compresses to essentials when the deadline is today", () => {
    const plan = planLocal({ goalText: "prepare a presentation for today", now: NOW });
    const sprints = plan.milestones.flatMap((m) => m.sprints);
    expect(sprints.length).toBeLessThanOrEqual(7);
    expect(plan.explanation).toMatch(/today/);
  });

  it("uses the chosen timeframe when the text has no deadline", () => {
    const plan = planLocal({ goalText: "Write my book", now: NOW, timeframe: "long_term" });
    expect(plan.timeframe).toBe("long_term");
    expect(plan.deadline).toBeUndefined();
    expect(plan.explanation).toMatch(/sustainable/);
  });

  it("never produces a single giant sprint for a book", () => {
    const plan = planLocal({ goalText: "Write a book", now: NOW, timeframe: "month" });
    const sprints = plan.milestones.flatMap((m) => m.sprints);
    expect(sprints.length).toBeGreaterThan(5);
    expect(sprints.every((s) => s.durationMin <= 90)).toBe(true);
  });
});

describe("materializePlan", () => {
  it("creates linked entities with schedules inside the horizon", () => {
    const plan = planLocal({ goalText: "Launch my website", now: NOW, timeframe: "week" });
    const { mission, milestones, sprints } = materializePlan(plan, "goal_1", NOW);
    expect(mission.status).toBe("active");
    expect(milestones[0]?.status).toBe("active");
    expect(sprints.every((s) => s.missionId === mission.id)).toBe(true);
    expect(sprints.every((s) => milestones.some((m) => m.id === s.milestoneId))).toBe(true);
    const days = sprints.map((s) => s.scheduledFor!).sort();
    expect(days[0]).toBe(toDay(NOW));
    expect(days[days.length - 1]! <= "2026-10-13").toBe(true);
    expect(sprints.map((s) => s.order)).toEqual(sprints.map((_, i) => i));
  });

  it("spreads a long-term plan out instead of cramming it", () => {
    const plan = planLocal({ goalText: "Write my book", now: NOW, timeframe: "long_term" });
    const { sprints } = materializePlan(plan, "goal_1", NOW);
    const distinctDays = new Set(sprints.map((s) => s.scheduledFor));
    expect(distinctDays.size).toBeGreaterThan(5);
  });
});

describe("scheduleSprints", () => {
  it("never schedules past the horizon", () => {
    const plan = planLocal({ goalText: "Launch my website", now: NOW, timeframe: "month" });
    const { sprints } = materializePlan(plan, "g", NOW);
    const scheduled = scheduleSprints(sprints, 3, NOW);
    expect(new Set(scheduled.map((s) => s.scheduledFor)).size).toBeLessThanOrEqual(3);
  });
});
