import type { AppState, Day, ID, Millis, Mission, PlanAdjustment, Sprint } from "../domain/types";
import { newId } from "../domain/ids";
import { addDays, daysUntil, toDay } from "../domain/time";
import { missedSprints, missionHealth, missionProgress, missionSprints } from "../domain/selectors";
import { horizonDays, scheduleSprints } from "../planning/planner";

/**
 * Adaptive planning. Plans are living things: when life gets in the way the
 * plan moves, the user doesn't get blamed.
 */

export interface Rebalance {
  sprints: Sprint[];
  adjustment?: PlanAdjustment;
}

/** Redistribute every planned sprint of a mission from today to its horizon. */
export function rebalanceMission(state: AppState, mission: Mission, now: Millis, reason: PlanAdjustment["kind"] = "rescheduled", message?: string): Rebalance {
  const planned = missionSprints(state, mission.id).filter((s) => s.status === "planned");
  if (planned.length === 0) return { sprints: [] };
  const horizon = horizonDays(mission.timeframe, mission.deadline, now);
  const rescheduled = scheduleSprints(planned, horizon, now);
  const changed = rescheduled.filter((s, i) => s.scheduledFor !== planned[i]?.scheduledFor);
  if (changed.length === 0) return { sprints: rescheduled };
  const adjustment: PlanAdjustment = {
    id: newId("adj"),
    kind: reason,
    missionId: mission.id,
    at: now,
    message: message ?? defaultMessage(reason, changed.length, mission),
  };
  return { sprints: rescheduled, adjustment };
}

function defaultMessage(kind: PlanAdjustment["kind"], count: number, mission: Mission): string {
  switch (kind) {
    case "rescheduled":
      return count === 1
        ? `Life got in the way. I've moved one sprint in ${mission.title} forward.`
        : `Life got in the way. I've spread the remaining ${count} sprints in ${mission.title} across the days you have left.`;
    case "reduced":
      return `I've lightened the next few days of ${mission.title}.`;
    case "deadline_near":
      return `Your deadline for ${mission.title} is close, so I've pulled the essential sprints forward.`;
    case "ahead":
      return `You're ahead on ${mission.title}. I've brought the next sprints forward so you can keep rolling.`;
    case "split":
      return `That sprint was bigger than expected. I've split it into two smaller ones.`;
  }
}

/** Finds missions with missed sprints and rebalances each. */
export function catchUp(state: AppState, now: Millis): { updates: Sprint[]; adjustments: PlanAdjustment[] } {
  const missed = missedSprints(state, now);
  const byMission = new Map<ID, Sprint[]>();
  for (const s of missed) byMission.set(s.missionId, [...(byMission.get(s.missionId) ?? []), s]);
  const updates: Sprint[] = [];
  const adjustments: PlanAdjustment[] = [];
  for (const [missionId] of byMission) {
    const mission = state.missions[missionId];
    if (!mission || mission.status !== "active") continue;
    const r = rebalanceMission(state, mission, now, "rescheduled");
    updates.push(...r.sprints);
    if (r.adjustment) adjustments.push(r.adjustment);
  }
  return { updates, adjustments };
}

/** Splits a sprint into two. Keeps order, keeps the milestone, flags lineage. */
export function splitSprint(sprint: Sprint, now: Millis, firstMinutes?: number): [Sprint, Sprint] {
  const half = firstMinutes ?? Math.max(5, Math.round(sprint.durationMin / 2 / 5) * 5);
  const second = Math.max(5, sprint.durationMin - half);
  const a: Sprint = { ...sprint, id: newId("spr"), title: `${sprint.title} (part 1)`, durationMin: half, splitFrom: sprint.id, status: "planned" };
  const b: Sprint = {
    ...sprint,
    id: newId("spr"),
    title: `${sprint.title} (part 2)`,
    durationMin: second,
    splitFrom: sprint.id,
    status: "planned",
    order: sprint.order + 0.5,
  };
  delete a.completedAt;
  delete a.actualMinutes;
  delete b.completedAt;
  delete b.actualMinutes;
  if (a.scheduledFor) b.scheduledFor = addDays(a.scheduledFor, 1);
  void now;
  return [a, b];
}

/** Should a sprint that ran out of time be split rather than retried? */
export function shouldSplitAfterOverrun(sprint: Sprint, focusedMinutes: number): boolean {
  return focusedMinutes >= sprint.durationMin && sprint.durationMin >= 20;
}

/** Deadline moved: reschedule and explain. */
export function applyDeadlineChange(state: AppState, mission: Mission, deadline: Millis | undefined, now: Millis): Rebalance {
  const updated: Mission = { ...mission };
  if (deadline === undefined) delete updated.deadline;
  else updated.deadline = deadline;
  const tmp: AppState = { ...state, missions: { ...state.missions, [mission.id]: updated } };
  const days = deadline === undefined ? undefined : daysUntil(deadline, now);
  const message =
    deadline === undefined
      ? `No deadline now. I've spaced ${mission.title} at a sustainable pace.`
      : days !== undefined && days <= 3
        ? `New deadline is close. I've pulled the essential sprints of ${mission.title} forward.`
        : `New deadline. I've spread ${mission.title} across the ${days} days you have.`;
  return rebalanceMission(tmp, updated, now, deadline !== undefined && days !== undefined && days <= 3 ? "deadline_near" : "rescheduled", message);
}

/** Fewer minutes today: push today's extra sprints to the following days. */
export function reduceToday(state: AppState, missionId: ID, keepMinutes: number, now: Millis): Rebalance {
  const mission = state.missions[missionId];
  if (!mission) return { sprints: [] };
  const today = toDay(now);
  const planned = missionSprints(state, missionId).filter((s) => s.status === "planned");
  let used = 0;
  let pushed = 0;
  const sprints = planned.map((s) => {
    if (s.scheduledFor !== today) return s;
    if (used + s.durationMin <= keepMinutes) {
      used += s.durationMin;
      return s;
    }
    pushed++;
    return { ...s, scheduledFor: addDays(today, 1) as Day };
  });
  if (pushed === 0) return { sprints };
  return {
    sprints,
    adjustment: { id: newId("adj"), kind: "reduced", missionId, at: now, message: `Lighter day. I've moved ${pushed} sprint${pushed === 1 ? "" : "s"} to tomorrow.` },
  };
}

/** Notices when a mission is ahead and offers to bring work forward. */
export function detectAhead(state: AppState, now: Millis): PlanAdjustment[] {
  const out: PlanAdjustment[] = [];
  for (const mission of Object.values(state.missions)) {
    if (mission.status !== "active") continue;
    if (missionHealth(state, mission, now) !== "ahead") continue;
    const p = missionProgress(state, mission.id);
    if (p.completed < 2 || p.remaining === 0) continue;
    out.push({ id: newId("adj"), kind: "ahead", missionId: mission.id, at: now, message: `You're ahead of plan on ${mission.title}.` });
  }
  return out;
}
