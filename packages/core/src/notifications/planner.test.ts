import { describe, expect, it } from "vitest";
import { planNotifications, respectQuietHours, syncNotifications, type NotificationProvider, type PlannedNotification } from "./planner";
import { createInitialState } from "../state/initial";
import { reduce } from "../state/reducer";
import { planLocal } from "../planning/planner";
import { timer } from "../timer";

const NOW = new Date(2026, 9, 7, 10, 0).getTime();

function stateWithMission() {
  let s = createInitialState(NOW);
  const plan = planLocal({ goalText: "Launch my website by Friday", now: NOW });
  s = reduce(s, { type: "mission/create", goalText: "Launch my website by Friday", plan, source: "typed", now: NOW });
  return s;
}

describe("notifications", () => {
  it("respects quiet hours", () => {
    const prefs = { enabled: true, sprintReminders: true, goalReminders: true, completion: true, aiSuggestions: true, quietHours: { enabled: true, start: "22:00", end: "08:00" } };
    const late = new Date(2026, 9, 7, 23, 0).getTime();
    const moved = respectQuietHours(late, prefs);
    expect(new Date(moved).getHours()).toBe(8);
    expect(new Date(moved).getDate()).toBe(8);
    const fine = new Date(2026, 9, 7, 12, 0).getTime();
    expect(respectQuietHours(fine, prefs)).toBe(fine);
  });

  it("schedules a sprint-end notification while a sprint runs", () => {
    let s = stateWithMission();
    const sprintId = Object.values(s.sprints)[0]!.id;
    s = reduce(s, { type: "sprint/start", sprintId, now: NOW });
    const t = timer.start(25 * 60_000, NOW);
    const planned = planNotifications(s, NOW, t);
    expect(planned).toHaveLength(1);
    expect(planned[0]?.kind).toBe("sprint_end");
    expect(planned[0]?.at).toBe(NOW + 25 * 60_000);
  });

  it("schedules nothing when disabled", () => {
    let s = stateWithMission();
    s = reduce(s, { type: "prefs/set", patch: { notifications: { ...s.preferences.notifications, enabled: false } }, now: NOW });
    expect(planNotifications(s, NOW)).toEqual([]);
  });

  it("plans a morning nudge and a deadline reminder", () => {
    const s = stateWithMission();
    const planned = planNotifications(s, NOW);
    expect(planned.map((p) => p.kind)).toContain("daily_mission");
    expect(planned.map((p) => p.kind)).toContain("deadline");
  });

  it("syncs by key without duplicates and only when granted", async () => {
    const scheduled = new Map<string, PlannedNotification>();
    let permission: "granted" | "denied" = "denied";
    const provider: NotificationProvider = {
      getPermission: async () => permission,
      requestPermission: async () => permission,
      schedule: async (n) => void scheduled.set(n.key, n),
      cancel: async (k) => void scheduled.delete(k),
      cancelAll: async () => scheduled.clear(),
      scheduledKeys: async () => [...scheduled.keys()],
    };
    const planned = planNotifications(stateWithMission(), NOW);
    await syncNotifications(provider, planned);
    expect(scheduled.size).toBe(0);
    permission = "granted";
    scheduled.set("old:1", { key: "old:1", kind: "deadline", at: 0, title: "", body: "" });
    await syncNotifications(provider, planned);
    expect(scheduled.has("old:1")).toBe(false);
    expect(scheduled.size).toBe(planned.length);
    await syncNotifications(provider, planned);
    expect(scheduled.size).toBe(planned.length);
  });
});
