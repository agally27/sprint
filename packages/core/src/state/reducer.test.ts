import { describe, expect, it } from "vitest";
import { createInitialState } from "./initial";
import { reduce } from "./reducer";
import { deserialize, serialize } from "./persistence";
import { planLocal } from "../planning/planner";
import { missionProgress, missionSprints, activeSession, missedSprints } from "../domain/selectors";
import { DAY, toDay, addDays } from "../domain/time";
import { recommendNext } from "../next/engine";
import { coach } from "../coach/engine";
import { weeklyReview, stats } from "../review/engine";
import { missionHealth } from "../domain/selectors";
import { createDemoState } from "../demo/demo";

const NOW = new Date(2026, 9, 7, 10, 0).getTime();
const MIN = 60_000;

function withMission(goal = "Launch my website", timeframe: "today" | "week" | "month" | "long_term" = "month", now = NOW) {
  let s = createInitialState(now);
  const plan = planLocal({ goalText: goal, timeframe, now });
  s = reduce(s, { type: "mission/create", goalText: goal, plan, source: "typed", now });
  const mission = Object.values(s.missions)[0]!;
  return { s, mission };
}

describe("journey: goal → plan → sprint → complete → reward → next", () => {
  it("runs the core loop end to end", () => {
    let { s, mission } = withMission();
    expect(s.onboarded).toBe(true);
    const sprints = missionSprints(s, mission.id);
    expect(sprints.length).toBeGreaterThan(8);

    const first = recommendNext(s, { now: NOW });
    expect(first.best?.sprint.id).toBe(sprints[0]!.id);
    expect(first.best?.reason).toBeTruthy();

    s = reduce(s, { type: "sprint/start", sprintId: sprints[0]!.id, now: NOW });
    expect(activeSession(s)).toBeDefined();
    expect(s.sprints[sprints[0]!.id]?.status).toBe("active");

    s = reduce(s, { type: "sprint/pause", now: NOW + 5 * MIN });
    s = reduce(s, { type: "sprint/resume", now: NOW + 7 * MIN });
    s = reduce(s, { type: "sprint/complete", now: NOW + 17 * MIN });

    expect(activeSession(s)).toBeUndefined();
    expect(s.sprints[sprints[0]!.id]?.status).toBe("completed");
    expect(s.sprints[sprints[0]!.id]?.actualMinutes).toBe(15);
    expect(s.lastCompletion?.momentumGain).toBeGreaterThan(0);
    expect(s.lastCompletion?.achievements).toContain("first_sprint");
    expect(s.lastCompletion?.missionProgress.completed).toBe(1);
    expect(s.momentum.focusMinutes).toBe(15);

    const next = recommendNext(s, { now: NOW + 18 * MIN, exclude: [sprints[0]!.id] });
    expect(next.best?.sprint.id).toBe(sprints[1]!.id);
    expect(next.best?.reasons.flow).toBeGreaterThan(0);
  });

  it("completes milestones and the mission when everything is done", () => {
    let { s, mission } = withMission("prepare a presentation for today");
    const sprints = missionSprints(s, mission.id);
    let t = NOW;
    for (const sp of sprints) {
      s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: t });
      t += sp.durationMin * MIN;
      s = reduce(s, { type: "sprint/complete", now: t });
    }
    expect(s.missions[mission.id]?.status).toBe("completed");
    expect(s.lastCompletion?.missionCompleted).toBe(true);
    expect(s.achievements.map((a) => a.key)).toContain("first_mission");
    expect(s.achievements.map((a) => a.key)).toContain("first_milestone");
    expect(Object.values(s.milestones).every((m) => m.status === "completed")).toBe(true);
  });

  it("treats an expired timer as a completed, time-boxed sprint", () => {
    let { s, mission } = withMission();
    const sp = missionSprints(s, mission.id)[0]!;
    s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: NOW });
    // App was backgrounded for an hour.
    s = reduce(s, { type: "app/foreground", now: NOW + 60 * MIN });
    s = reduce(s, { type: "sprint/complete", now: NOW + 60 * MIN });
    expect(s.lastCompletion?.expired).toBe(true);
    expect(s.lastCompletion?.focusedMinutes).toBe(sp.durationMin);
    expect(s.sessions[s.lastCompletion!.sessionId]?.outcome).toBe("expired");
  });

  it("cancelling returns the sprint to planned", () => {
    let { s, mission } = withMission();
    const sp = missionSprints(s, mission.id)[0]!;
    s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: NOW });
    s = reduce(s, { type: "sprint/cancel", now: NOW + MIN });
    expect(s.sprints[sp.id]?.status).toBe("planned");
    expect(activeSession(s)).toBeUndefined();
  });

  it("starting a second sprint cancels the first", () => {
    let { s, mission } = withMission();
    const [a, b] = missionSprints(s, mission.id);
    s = reduce(s, { type: "sprint/start", sprintId: a!.id, now: NOW });
    s = reduce(s, { type: "sprint/start", sprintId: b!.id, now: NOW + MIN });
    expect(s.sprints[a!.id]?.status).toBe("planned");
    expect(s.sprints[b!.id]?.status).toBe("active");
  });

  it("supports a partial sprint when time is short", () => {
    let { s, mission } = withMission();
    const r = recommendNext(s, { now: NOW, availableMin: 10 });
    expect(r.best).toBeDefined();
    expect(r.best!.sprint.durationMin <= 10 || r.best!.suggestedMinutes === 10).toBe(true);
    const sp = missionSprints(s, mission.id).find((x) => x.durationMin >= 25)!;
    s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: NOW, minutes: 10 });
    expect(activeSession(s)?.durationMs).toBe(10 * MIN);
  });
});

describe("journey: missed sprints, rescheduling, adaptation", () => {
  it("moves missed sprints forward without blame", () => {
    let { s, mission } = withMission("Launch my website", "week");
    const later = NOW + 3 * DAY;
    expect(missedSprints(s, later).length).toBeGreaterThan(0);
    s = reduce(s, { type: "app/foreground", now: later });
    expect(missedSprints(s, later)).toHaveLength(0);
    const adj = s.pendingAdjustments[0];
    expect(adj?.kind).toBe("rescheduled");
    expect(adj?.message).toMatch(/Life got in the way/);
    expect(adj?.message).not.toMatch(/fail|behind|missed/i);
    const days = missionSprints(s, mission.id).map((x) => x.scheduledFor!);
    expect(days.every((d) => d >= toDay(later))).toBe(true);
  });

  it("splits a sprint into two smaller ones", () => {
    let { s, mission } = withMission();
    const sp = missionSprints(s, mission.id).find((x) => x.durationMin === 45)!;
    const before = missionSprints(s, mission.id).length;
    s = reduce(s, { type: "sprint/split", sprintId: sp.id, now: NOW });
    const after = missionSprints(s, mission.id);
    expect(after.length).toBe(before + 1);
    const parts = after.filter((x) => x.splitFrom === sp.id);
    expect(parts).toHaveLength(2);
    expect(parts[0]!.durationMin + parts[1]!.durationMin).toBe(45);
    expect(after.map((x) => x.order)).toEqual(after.map((_, i) => i));
  });

  it("adds a follow-up sprint when more time is needed", () => {
    let { s, mission } = withMission();
    const sp = missionSprints(s, mission.id)[0]!;
    s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: NOW });
    s = reduce(s, { type: "sprint/complete", now: NOW + sp.durationMin * MIN });
    s = reduce(s, { type: "sprint/followUp", sprintId: sp.id, minutes: 15, now: NOW + 20 * MIN });
    const all = missionSprints(s, mission.id);
    expect(all[1]?.title).toMatch(/continued/);
    expect(all[1]?.durationMin).toBe(15);
    expect(all[1]?.milestoneId).toBe(sp.milestoneId);
  });

  it("reschedules when the deadline changes", () => {
    let { s, mission } = withMission("Launch my website", "month");
    const soon = NOW + 2 * DAY;
    s = reduce(s, { type: "mission/update", missionId: mission.id, patch: { deadline: soon }, now: NOW });
    expect(s.missions[mission.id]?.deadline).toBe(soon);
    const days = missionSprints(s, mission.id).map((x) => x.scheduledFor!);
    expect(days.every((d) => d <= toDay(soon))).toBe(true);
    expect(s.pendingAdjustments.at(-1)?.message).toMatch(/deadline/i);
  });

  it("reduces today's load on request", () => {
    let { s, mission } = withMission("Launch my website", "today");
    const today = toDay(NOW);
    const todays = missionSprints(s, mission.id).filter((x) => x.scheduledFor === today);
    expect(todays.length).toBeGreaterThan(1);
    s = reduce(s, { type: "plan/reduceToday", missionId: mission.id, keepMinutes: 20, now: NOW });
    const remaining = missionSprints(s, mission.id).filter((x) => x.scheduledFor === today);
    expect(remaining.reduce((a, x) => a + x.durationMin, 0)).toBeLessThanOrEqual(20);
    expect(missionSprints(s, mission.id).some((x) => x.scheduledFor === addDays(today, 1))).toBe(true);
  });

  it("skipping settles milestones and a paused mission is not recommended", () => {
    let { s, mission } = withMission();
    const sp = missionSprints(s, mission.id)[0]!;
    s = reduce(s, { type: "sprint/skip", sprintId: sp.id, now: NOW });
    expect(s.sprints[sp.id]?.status).toBe("skipped");
    s = reduce(s, { type: "mission/pause", missionId: mission.id, now: NOW });
    expect(recommendNext(s, { now: NOW }).empty).toBe("no_missions");
    s = reduce(s, { type: "mission/resume", missionId: mission.id, now: NOW + DAY });
    expect(recommendNext(s, { now: NOW + DAY }).best).toBeDefined();
  });

  it("computes mission health gently", () => {
    let { s, mission } = withMission("Launch my website by friday");
    expect(missionHealth(s, s.missions[mission.id]!, NOW)).toBe("on_track");
    expect(missionHealth(s, s.missions[mission.id]!, NOW + 2 * DAY)).toBe("at_risk");
    const sprints = missionSprints(s, mission.id);
    let t = NOW;
    for (const sp of sprints.slice(0, Math.ceil(sprints.length * 0.7))) {
      s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: t });
      t += sp.durationMin * MIN;
      s = reduce(s, { type: "sprint/complete", now: t });
    }
    expect(missionHealth(s, s.missions[mission.id]!, t)).toBe("ahead");
  });
});

describe("multiple missions and what next", () => {
  it("prefers the urgent deadline, then rotates stale missions", () => {
    let s = createInitialState(NOW);
    s = reduce(s, { type: "mission/create", goalText: "Write my book", plan: planLocal({ goalText: "Write my book", timeframe: "long_term", now: NOW }), source: "typed", now: NOW });
    s = reduce(s, { type: "mission/create", goalText: "Prepare a presentation for Friday", plan: planLocal({ goalText: "Prepare a presentation for Friday", now: NOW }), source: "typed", now: NOW });
    const r = recommendNext(s, { now: NOW });
    expect(r.best?.mission.title).toBe("Prepare My Presentation");
    expect(r.alternatives.map((a) => a.mission.title)).toContain("Write My Book");
  });

  it("builds a daily mission of at most three sprints", () => {
    let { s } = withMission();
    s = reduce(s, { type: "daily/build", now: NOW });
    expect(s.dailyMission?.sprintIds.length).toBeLessThanOrEqual(3);
    expect(s.dailyMission?.sprintIds.length).toBeGreaterThan(0);
  });

  it("the coach suggests, welcomes back, and recommends breaks without guilt", () => {
    let { s, mission } = withMission();
    expect(coach(s, NOW)[0]?.kind).toBe("suggest");
    const sprints = missionSprints(s, mission.id);
    let t = NOW;
    for (const sp of sprints.slice(0, 3)) {
      s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: t });
      t += sp.durationMin * MIN;
      s = reduce(s, { type: "sprint/complete", now: t });
    }
    const msgs = coach(s, t);
    expect(msgs[0]?.kind).toBe("break");
    const later = coach(s, t + 8 * DAY);
    expect(later[0]?.kind).toBe("welcome_back");
    for (const m of [...msgs, ...later]) expect(m.text).not.toMatch(/fail|behind|missed|guilt/i);
  });
});

describe("review, stats, persistence, demo", () => {
  it("summarises the week", () => {
    let { s, mission } = withMission();
    const sprints = missionSprints(s, mission.id);
    let t = NOW;
    for (const sp of sprints.slice(0, 4)) {
      s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: t });
      t += sp.durationMin * MIN;
      s = reduce(s, { type: "sprint/complete", now: t });
      t += 6 * 60 * MIN;
    }
    const r = weeklyReview(s, t);
    expect(r.sprintsCompleted).toBe(4);
    expect(r.focusedMinutes).toBeGreaterThan(0);
    expect(r.missionsProgressed[0]?.title).toBe("Launch My Website");
    expect(r.reflection).toMatch(/4 sprints/);
    expect(r.perDay.reduce((a, b) => a + b, 0)).toBe(4);
    const st = stats(s, t);
    expect(st.sprintsCompleted).toBe(4);
    expect(st.last28Days).toHaveLength(28);
    expect(st.minutesByMission[0]?.minutes).toBe(st.focusedMinutes);
  });

  it("round-trips through persistence and tolerates garbage", () => {
    let { s, mission } = withMission();
    const sp = missionSprints(s, mission.id)[0]!;
    s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: NOW });
    const restored = deserialize(serialize(s), NOW + MIN);
    expect(restored.activeSessionId).toBe(s.activeSessionId);
    expect(Object.keys(restored.sprints)).toHaveLength(Object.keys(s.sprints).length);
    expect(deserialize("not json", NOW).onboarded).toBe(false);
    expect(deserialize(JSON.stringify({ version: 0, activeSessionId: "ghost" }), NOW).activeSessionId).toBeUndefined();
  });

  it("creates a demo that is understandable at a glance", () => {
    const s = createDemoState(NOW);
    const missions = Object.values(s.missions);
    expect(missions).toHaveLength(2);
    const website = missions.find((m) => m.title === "Launch My Website")!;
    const p = missionProgress(s, website.id);
    expect(p.completed).toBe(5);
    expect(p.remaining).toBeGreaterThan(5);
    expect(s.momentum.score).toBeGreaterThan(10);
    expect(s.lastCompletion).toBeUndefined();
    expect(s.activeSessionId).toBeUndefined();
    expect(recommendNext(s, { now: NOW }).best).toBeDefined();
  });

  it("resets data but keeps preferences", () => {
    let { s } = withMission();
    s = reduce(s, { type: "prefs/set", patch: { haptics: false }, now: NOW });
    s = reduce(s, { type: "data/reset", now: NOW });
    expect(Object.keys(s.missions)).toHaveLength(0);
    expect(s.preferences.haptics).toBe(false);
  });
});
