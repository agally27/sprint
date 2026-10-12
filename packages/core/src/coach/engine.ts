import type { AppState, ID, Millis } from "../domain/types";
import { daysUntil, toDay } from "../domain/time";
import {
  activeMissions,
  daysSince,
  focusedMinutesOn,
  lastActivityAt,
  missionHealth,
  missionProgress,
  sprintsCompletedOn,
} from "../domain/selectors";
import { recommendNext } from "../next/engine";

/**
 * The coach speaks in short, useful interventions. It never nags and never
 * uses guilt. One message at a time, ranked by usefulness.
 */

export type CoachKind =
  | "welcome_back"
  | "break"
  | "ahead"
  | "deadline"
  | "stale"
  | "suggest"
  | "done_today"
  | "first_time"
  | "strong_momentum";

export interface CoachMessage {
  kind: CoachKind;
  text: string;
  missionId?: ID;
  sprintId?: ID;
  priority: number;
}

export function greeting(now: Millis, name?: string): string {
  const h = new Date(now).getHours();
  const base = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${base}, ${name}` : base;
}

export function coach(state: AppState, now: Millis): CoachMessage[] {
  const out: CoachMessage[] = [];
  const missions = activeMissions(state);
  const today = toDay(now);
  const todayCount = sprintsCompletedOn(state, today).length;
  const todayMinutes = focusedMinutesOn(state, today);

  if (missions.length === 0) {
    out.push({ kind: "first_time", text: "Start with one goal. Sprint will turn it into something you can begin today.", priority: 100 });
    return out;
  }

  const gap = daysSince(lastActivityAt(state), now);
  if (gap !== undefined && gap >= 3 && todayCount === 0) {
    out.push({
      kind: "welcome_back",
      text: gap >= 7 ? "Welcome back. Nothing is lost. Pick one small sprint and we'll adjust the plan around you." : "Good to see you. Your plan moved with you. Ready for a short sprint?",
      priority: 90,
    });
  }

  if (todayCount >= 3 || todayMinutes >= 100) {
    out.push({
      kind: "break",
      text: todayCount >= 4 ? "Four sprints today. That's a strong run. A proper break now will make tomorrow easier." : "Three focused sprints today. You're on a strong run. Consider a break.",
      priority: 80,
    });
  }

  for (const m of missions) {
    const health = missionHealth(state, m, now);
    const p = missionProgress(state, m.id);
    if (m.deadline !== undefined) {
      const days = daysUntil(m.deadline, now);
      if (days <= 3 && p.remaining > 0) {
        out.push({
          kind: "deadline",
          text: days <= 1 ? `${m.title} is due today. Here's the simplest path: the next sprint.` : `${m.title} is due in ${days - 1} day${days - 1 === 1 ? "" : "s"}. Here's the simplest path forward.`,
          missionId: m.id,
          priority: 85,
        });
      }
    }
    if (health === "ahead" && p.completed >= 2) {
      out.push({ kind: "ahead", text: `You're ahead of schedule on ${m.title}.`, missionId: m.id, priority: 60 });
    }
    const since = daysSince(m.lastActivityAt ?? m.createdAt, now);
    if (since !== undefined && since >= 5 && p.remaining > 0 && missions.length > 1) {
      out.push({ kind: "stale", text: `You haven't touched ${m.title} for ${since} days. Want to restart it with a short sprint?`, missionId: m.id, priority: 50 });
    }
  }

  if (state.momentum.score >= 70 && todayCount > 0) {
    out.push({ kind: "strong_momentum", text: "Momentum is strong. Progress is compounding.", priority: 40 });
  }

  const next = recommendNext(state, { now });
  if (next.best && todayCount < 3) {
    out.push({
      kind: "suggest",
      text: `Got ${next.best.sprint.durationMin} minutes? I'd recommend "${next.best.sprint.title}" for ${next.best.mission.title}.`,
      missionId: next.best.mission.id,
      sprintId: next.best.sprint.id,
      priority: 30,
    });
  } else if (!next.best && next.empty === "all_done") {
    out.push({ kind: "done_today", text: "Every planned sprint is complete. Add a goal when you're ready for the next thing.", priority: 70 });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

export function topCoachMessage(state: AppState, now: Millis): CoachMessage | undefined {
  return coach(state, now)[0];
}

/** Anti-guilt copy for a missed or expired sprint. */
export const RESCHEDULE_COPY = [
  "Life got in the way. Want to reschedule?",
  "Your plan needs a little more time. Let's adjust.",
  "Let's make the next step smaller.",
];

export const COMPLETION_COPY = [
  "You moved the goal forward.",
  "Another step done.",
  "Momentum built.",
  "That's real progress.",
  "One less thing between you and done.",
];

export function completionLine(seed: number): string {
  return COMPLETION_COPY[Math.abs(seed) % COMPLETION_COPY.length] ?? COMPLETION_COPY[0]!;
}
