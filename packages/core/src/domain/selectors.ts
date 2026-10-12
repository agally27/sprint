import type { AppState, Day, ID, Millis, Milestone, Mission, MissionHealth, Sprint } from "./types";
import { daysUntil, toDay } from "./time";

export function missionSprints(state: AppState, missionId: ID): Sprint[] {
  return Object.values(state.sprints)
    .filter((s) => s.missionId === missionId)
    .sort((a, b) => a.order - b.order);
}

export function missionMilestones(state: AppState, missionId: ID): Milestone[] {
  return Object.values(state.milestones)
    .filter((m) => m.missionId === missionId)
    .sort((a, b) => a.order - b.order);
}

export function milestoneSprints(state: AppState, milestoneId: ID): Sprint[] {
  return Object.values(state.sprints)
    .filter((s) => s.milestoneId === milestoneId)
    .sort((a, b) => a.order - b.order);
}

export function activeMissions(state: AppState): Mission[] {
  return Object.values(state.missions)
    .filter((m) => m.status === "active")
    .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
}

export function visibleMissions(state: AppState): Mission[] {
  return Object.values(state.missions)
    .filter((m) => m.status !== "archived")
    .sort((a, b) => {
      const rank = (m: Mission) => (m.status === "active" ? 0 : m.status === "paused" ? 1 : 2);
      return rank(a) - rank(b) || a.priority - b.priority || b.updatedAt - a.updatedAt;
    });
}

export interface MissionProgress {
  total: number;
  completed: number;
  remaining: number;
  /** 0 → 1 by sprint count. */
  ratio: number;
  /** 0 → 1 by minutes, which better reflects effort. */
  effortRatio: number;
  remainingMinutes: number;
  completedMinutes: number;
}

export function missionProgress(state: AppState, missionId: ID): MissionProgress {
  const sprints = missionSprints(state, missionId).filter((s) => s.status !== "skipped");
  const completed = sprints.filter((s) => s.status === "completed");
  const totalMin = sprints.reduce((a, s) => a + s.durationMin, 0);
  const doneMin = completed.reduce((a, s) => a + s.durationMin, 0);
  return {
    total: sprints.length,
    completed: completed.length,
    remaining: sprints.length - completed.length,
    ratio: sprints.length === 0 ? 0 : completed.length / sprints.length,
    effortRatio: totalMin === 0 ? 0 : doneMin / totalMin,
    remainingMinutes: totalMin - doneMin,
    completedMinutes: doneMin,
  };
}

/** The first planned sprint in order, i.e. what to do next within a mission. */
export function nextSprintFor(state: AppState, missionId: ID): Sprint | undefined {
  return missionSprints(state, missionId).find((s) => s.status === "planned" || s.status === "active");
}

export function currentMilestone(state: AppState, missionId: ID): Milestone | undefined {
  const next = nextSprintFor(state, missionId);
  if (next) return state.milestones[next.milestoneId];
  return missionMilestones(state, missionId).find((m) => m.status !== "completed");
}

/**
 * Ahead, on track, or at risk, by comparing effort done with the share of the
 * timeline elapsed. Internal: the UI only ever surfaces this gently.
 */
export function missionHealth(state: AppState, mission: Mission, now: Millis): MissionHealth {
  if (mission.status === "completed") return "completed";
  if (mission.deadline === undefined) return "open";
  const p = missionProgress(state, mission.id);
  const totalDays = Math.max(1, daysUntil(mission.deadline, mission.createdAt));
  const elapsedDays = Math.max(0, daysUntil(now, mission.createdAt) - 1);
  const expected = Math.min(1, elapsedDays / totalDays);
  const diff = p.effortRatio - expected;
  if (daysUntil(mission.deadline, now) < 1 && p.remaining > 0) return "at_risk";
  if (diff >= 0.12) return "ahead";
  if (diff <= -0.2) return "at_risk";
  return "on_track";
}

export function completedSprints(state: AppState): Sprint[] {
  return Object.values(state.sprints)
    .filter((s) => s.status === "completed" && s.completedAt !== undefined)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
}

export function sprintsCompletedOn(state: AppState, day: Day): Sprint[] {
  return completedSprints(state).filter((s) => toDay(s.completedAt!) === day);
}

export function focusedMinutesOn(state: AppState, day: Day): number {
  return sprintsCompletedOn(state, day).reduce((a, s) => a + (s.actualMinutes ?? s.durationMin), 0);
}

export function lastActivityAt(state: AppState): Millis | undefined {
  const last = completedSprints(state).at(-1);
  return last?.completedAt;
}

export function daysSince(at: Millis | undefined, now: Millis): number | undefined {
  if (at === undefined) return undefined;
  return Math.max(0, Math.floor((now - at) / 86_400_000));
}

export function activeSession(state: AppState) {
  return state.activeSessionId ? state.sessions[state.activeSessionId] : undefined;
}

export function activeSprint(state: AppState): Sprint | undefined {
  const session = activeSession(state);
  return session ? state.sprints[session.sprintId] : undefined;
}

export function missedSprints(state: AppState, now: Millis): Sprint[] {
  const today = toDay(now);
  return Object.values(state.sprints).filter(
    (s) => s.status === "planned" && s.scheduledFor !== undefined && s.scheduledFor < today && state.missions[s.missionId]?.status === "active",
  );
}

export function sprintsScheduledOn(state: AppState, day: Day): Sprint[] {
  return Object.values(state.sprints)
    .filter((s) => s.status === "planned" && s.scheduledFor === day && state.missions[s.missionId]?.status === "active")
    .sort((a, b) => a.order - b.order);
}
