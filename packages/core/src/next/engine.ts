import type { AppState, ID, Millis, Mission, Sprint } from "../domain/types";
import { daysUntil, toDay } from "../domain/time";
import {
  activeMissions,
  currentMilestone,
  daysSince,
  milestoneSprints,
  missionProgress,
  missionSprints,
  sprintsCompletedOn,
} from "../domain/selectors";

/**
 * "What should I do next?"
 *
 * Scores the next sprint of every active mission against deadlines, priority,
 * staleness, flow, today's schedule and the time the user actually has.
 * Returns one strong recommendation plus a few alternatives.
 */

export interface NextOptions {
  now: Millis;
  /** Minutes the user has right now. */
  availableMin?: number;
  /** Sprints to leave out, e.g. the one just completed or declined. */
  exclude?: ID[];
  /** Prefer this mission when scores are close (e.g. keep going after a sprint). */
  preferMissionId?: ID;
}

export interface Recommendation {
  sprint: Sprint;
  mission: Mission;
  reason: string;
  score: number;
  /** When set, the sprint was longer than the time available and should be run for this many minutes. */
  suggestedMinutes?: number;
  reasons: Record<string, number>;
}

export interface NextResult {
  best?: Recommendation;
  alternatives: Recommendation[];
  /** Why nothing fits, when `best` is undefined. */
  empty?: "no_missions" | "all_done" | "nothing_fits";
}

function reasonText(r: Record<string, number>, sprint: Sprint, mission: Mission, opts: NextOptions, firstOfMilestone: boolean, milestoneTitle: string | undefined): string {
  const top = Object.entries(r)
    .filter(([k]) => k !== "base")
    .sort((a, b) => b[1] - a[1])[0];
  // Continuing the mission you were just working on reads better than restating its priority.
  const key = opts.preferMissionId === mission.id && (r.flow ?? 0) > 0 ? "flow" : top?.[0];
  if (opts.availableMin !== undefined && sprint.durationMin > opts.availableMin) {
    return `It's the most useful thing you can do with ${opts.availableMin} minutes. We'll stop early and keep the rest for later.`;
  }
  switch (key) {
    case "deadline":
      return mission.deadline !== undefined && daysUntil(mission.deadline, opts.now) <= 2
        ? `Your deadline is close. This is the shortest path forward.`
        : `This keeps ${mission.title} on track for its deadline.`;
    case "stale":
      return `You haven't touched ${mission.title} for a few days. A short sprint keeps it alive.`;
    case "flow":
      return `You're in flow on ${mission.title}. Keep going.`;
    case "scheduled":
      return firstOfMilestone && milestoneTitle
        ? `It's planned for today and opens the ${milestoneTitle.toLowerCase()} stage.`
        : `It's planned for today.`;
    case "fit":
      return `It fits the ${opts.availableMin} minutes you have.`;
    case "priority":
      return `${mission.title} is your top priority right now.`;
    case "milestone":
      return `This unlocks the next stage of ${mission.title}.`;
    case "quick_win":
      return `Short and concrete. An easy way to get moving.`;
    default:
      return `It's the next step in ${mission.title}.`;
  }
}

export function recommendNext(state: AppState, opts: NextOptions): NextResult {
  const missions = activeMissions(state);
  if (missions.length === 0) return { alternatives: [], empty: "no_missions" };

  const exclude = new Set(opts.exclude ?? []);
  const today = toDay(opts.now);
  const todayCount = sprintsCompletedOn(state, today).length;
  const candidates: Recommendation[] = [];

  for (const mission of missions) {
    const sprints = missionSprints(state, mission.id);
    const planned = sprints.filter((s) => s.status === "planned" && !exclude.has(s.id));
    // Consider the next two in order so a short one can be preferred when time is tight.
    const window = planned.slice(0, 2);
    const progress = missionProgress(state, mission.id);
    const sinceActivity = daysSince(mission.lastActivityAt, opts.now);
    const milestone = currentMilestone(state, mission.id);

    window.forEach((sprint, idx) => {
      const r: Record<string, number> = { base: idx > 0 ? 4 : 10 };

      // Priority.
      r.priority = mission.priority === 1 ? 18 : mission.priority === 2 ? 8 : 0;

      // Deadline pressure relative to work remaining.
      if (mission.deadline !== undefined) {
        const days = Math.max(1, daysUntil(mission.deadline, opts.now));
        const minutesPerDayNeeded = progress.remainingMinutes / days;
        r.deadline = Math.min(30, Math.round(minutesPerDayNeeded / 3));
        if (days <= 3) r.deadline += 10;
      }

      // Staleness: gently rotate missions that are cooling, without guilt.
      if (sinceActivity !== undefined && sinceActivity >= 2) r.stale = Math.min(12, 3 + sinceActivity * 2);

      // Flow: continuing the mission worked today.
      if (mission.lastActivityAt !== undefined && toDay(mission.lastActivityAt) === today) r.flow = 9;
      if (opts.preferMissionId === mission.id) r.flow = (r.flow ?? 0) + 6;

      // Scheduled for today.
      if (sprint.scheduledFor === today) r.scheduled = 14;
      else if (sprint.scheduledFor !== undefined && sprint.scheduledFor < today) r.scheduled = 8;

      // First sprint of a milestone unlocks a stage.
      const inMilestone = milestoneSprints(state, sprint.milestoneId);
      const firstOfMilestone = inMilestone.findIndex((s) => s.status !== "completed" && s.status !== "skipped") === inMilestone.indexOf(sprint) && inMilestone.every((s) => s.order >= sprint.order || s.status !== "planned");
      if (firstOfMilestone && milestone && milestone.id === sprint.milestoneId && inMilestone[0]?.id === sprint.id) r.milestone = 4;

      // Time fit.
      let suggestedMinutes: number | undefined;
      if (opts.availableMin !== undefined) {
        if (sprint.durationMin <= opts.availableMin) {
          const closeness = sprint.durationMin / opts.availableMin;
          r.fit = Math.round(6 + 12 * closeness);
        } else if (opts.availableMin >= 5 && sprint.durationMin > opts.availableMin) {
          // Run a partial sprint. Penalise so a sprint that fits wins when available.
          suggestedMinutes = opts.availableMin;
          r.fit = -8;
        } else {
          return;
        }
      }

      // Later in the day, after a few sprints, lighter work scores better.
      if (todayCount >= 3 && sprint.energy === "light") r.quick_win = 6;
      if (todayCount >= 3 && sprint.energy === "deep") r.quick_win = -6;
      if (todayCount === 0 && sprint.durationMin <= 15) r.quick_win = 3;

      const score = Object.values(r).reduce((a, b) => a + b, 0);
      const rec: Recommendation = {
        sprint,
        mission,
        score,
        reasons: r,
        reason: reasonText(r, sprint, mission, opts, !!r.milestone, milestone?.title),
      };
      if (suggestedMinutes !== undefined) rec.suggestedMinutes = suggestedMinutes;
      candidates.push(rec);
    });
  }

  if (candidates.length === 0) {
    const anyPlanned = Object.values(state.sprints).some((s) => s.status === "planned" && state.missions[s.missionId]?.status === "active");
    return { alternatives: [], empty: anyPlanned ? "nothing_fits" : "all_done" };
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0]!;
  // Alternatives: distinct missions first, then anything else.
  const alternatives: Recommendation[] = [];
  const seen = new Set<ID>([best.mission.id]);
  for (const c of candidates.slice(1)) {
    if (alternatives.length >= 3) break;
    if (c.sprint.id === best.sprint.id) continue;
    if (!seen.has(c.mission.id) || alternatives.length >= missions.length - 1) {
      alternatives.push(c);
      seen.add(c.mission.id);
    }
  }
  return { best, alternatives };
}

/** Today's mission: one important sprint and up to two optional ones. Then stop. */
export function buildDailyMission(state: AppState, now: Millis): ID[] {
  const first = recommendNext(state, { now });
  if (!first.best) return [];
  const ids = [first.best.sprint.id];
  const second = recommendNext(state, { now, exclude: ids });
  if (second.best) ids.push(second.best.sprint.id);
  const third = recommendNext(state, { now, exclude: ids });
  if (third.best) ids.push(third.best.sprint.id);
  return ids;
}
