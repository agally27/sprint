import type { AppState } from "../domain/types";
import { DAY, HOUR } from "../domain/time";
import { planLocal } from "../planning/planner";
import { reduce } from "../state/reducer";
import { createInitialState } from "../state/initial";

/**
 * A polished example so the product is understandable in ten seconds.
 * "Launch my website" over 30 days with a few sprints already done.
 */
export function createDemoState(now: number): AppState {
  const start = now - 6 * DAY;
  let s = createInitialState(start);

  const website = planLocal({ goalText: "Launch my website in 30 days", now: start });
  s = reduce(s, { type: "mission/create", goalText: "Launch my website in 30 days", plan: website, source: "demo", now: start, priority: 1 });
  const websiteId = Object.values(s.missions)[0]!.id;

  const run = planLocal({ goalText: "Run a 10K", timeframe: "long_term", now: start + HOUR });
  s = reduce(s, { type: "mission/create", goalText: "Run a 10K", plan: run, source: "demo", now: start + HOUR, priority: 2 });

  // Complete the first few website sprints across the last six days.
  const sprints = Object.values(s.sprints)
    .filter((sp) => sp.missionId === websiteId)
    .sort((a, b) => a.order - b.order);
  const completions = [start + 2 * HOUR, start + DAY + 3 * HOUR, start + 2 * DAY + HOUR, start + 4 * DAY + 2 * HOUR, start + 5 * DAY + 3 * HOUR];
  completions.forEach((at, i) => {
    const sp = sprints[i];
    if (!sp) return;
    s = reduce(s, { type: "sprint/start", sprintId: sp.id, now: at });
    s = reduce(s, { type: "sprint/complete", now: at + sp.durationMin * 60_000 });
  });

  // One running sprint done.
  const runSprint = Object.values(s.sprints).filter((sp) => sp.missionId !== websiteId).sort((a, b) => a.order - b.order)[0];
  if (runSprint) {
    s = reduce(s, { type: "sprint/start", sprintId: runSprint.id, now: start + 3 * DAY + 4 * HOUR });
    s = reduce(s, { type: "sprint/complete", now: start + 3 * DAY + 4 * HOUR + runSprint.durationMin * 60_000 });
  }

  s = reduce(s, { type: "completion/clear" });
  s = reduce(s, { type: "app/foreground", now });
  // A first impression should be calm: no catch-up notice from the backdated plan.
  return { ...s, onboarded: true, pendingAdjustments: [] };
}
