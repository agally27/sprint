import { describe, expect, it } from "vitest";
import { DAY } from "../domain/time";
import type { Sprint } from "../domain/types";
import { addCompletion, band, cooled, evaluateAchievements, initialMomentum, levelFor } from "./momentum";

const T0 = new Date(2026, 9, 7, 10, 0).getTime();

const sprint = (over: Partial<Sprint> = {}): Sprint => ({
  id: over.id ?? "s1",
  missionId: "m1",
  milestoneId: "ms1",
  title: "x",
  durationMin: 25,
  order: 0,
  status: "completed",
  energy: "focused",
  ...over,
});

describe("momentum", () => {
  it("grows with completed sprints and caps at 100", () => {
    let m = initialMomentum(T0);
    const { next, gain } = addCompletion(m, sprint(), 25, T0);
    expect(gain).toBeGreaterThan(5);
    expect(next.score).toBe(gain);
    m = next;
    for (let i = 0; i < 30; i++) m = addCompletion(m, sprint({ energy: "deep", durationMin: 90 }), 90, T0 + i).next;
    expect(m.score).toBeLessThanOrEqual(100);
    expect(m.focusMinutes).toBe(25 + 30 * 90);
  });

  it("cools slowly with a four-day half-life and never snaps to zero", () => {
    const m = { score: 80, focusMinutes: 0, updatedAt: T0 };
    expect(cooled(m, T0)).toBe(80);
    expect(cooled(m, T0 + 4 * DAY)).toBeCloseTo(40, 0);
    expect(cooled(m, T0 + 8 * DAY)).toBeCloseTo(20, 0);
    expect(cooled(m, T0 + 30 * DAY)).toBeGreaterThan(0);
  });

  it("rewards longer, deeper work more", () => {
    const base = initialMomentum(T0);
    const light = addCompletion(base, sprint({ durationMin: 5, energy: "light" }), 5, T0).gain;
    const deep = addCompletion(base, sprint({ durationMin: 60, energy: "deep" }), 60, T0).gain;
    expect(deep).toBeGreaterThan(light);
  });

  it("names bands", () => {
    expect(band(5)).toBe("warming");
    expect(band(30)).toBe("building");
    expect(band(50)).toBe("rolling");
    expect(band(75)).toBe("strong");
    expect(band(95)).toBe("peak");
  });

  it("derives levels from lifetime minutes", () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(59).level).toBe(1);
    expect(levelFor(60).level).toBe(2);
    expect(levelFor(60).name).toBe("Mover");
    expect(levelFor(500).level).toBe(4);
    expect(levelFor(500).progress).toBeGreaterThan(0);
  });
});

describe("achievements", () => {
  const ctx = (over: Partial<Parameters<typeof evaluateAchievements>[0]>) => ({
    now: T0,
    completedSprints: [sprint({ completedAt: T0 })],
    justCompleted: sprint({ completedAt: T0 }),
    focusedMinutes: 25,
    momentumScore: 10,
    lifetimeFocusMinutes: 25,
    milestoneCompleted: false,
    missionCompleted: false,
    events: [],
    existing: [],
    ...over,
  });

  it("awards the first sprint once", () => {
    const first = evaluateAchievements(ctx({}));
    expect(first.map((a) => a.key)).toEqual(["first_sprint"]);
    const again = evaluateAchievements(ctx({ existing: first }));
    expect(again).toEqual([]);
  });

  it("awards a comeback after five quiet days", () => {
    const old = sprint({ id: "old", completedAt: T0 - 6 * DAY });
    const res = evaluateAchievements(ctx({ completedSprints: [old, sprint({ completedAt: T0 })], existing: [{ key: "first_sprint", unlockedAt: 0 }] }));
    expect(res.map((a) => a.key)).toContain("comeback");
  });

  it("awards deep focus and strong day", () => {
    const todays = [1, 2, 3].map((i) => sprint({ id: `t${i}`, completedAt: T0 + i }));
    const res = evaluateAchievements(ctx({ completedSprints: todays, focusedMinutes: 60, existing: [{ key: "first_sprint", unlockedAt: 0 }] }));
    expect(res.map((a) => a.key).sort()).toEqual(["deep_focus", "strong_day"]);
  });
});
