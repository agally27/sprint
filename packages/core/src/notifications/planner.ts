import type { AppState, Millis, NotificationPrefs } from "../domain/types";
import { DAY, HOUR, MINUTE, dayStart, daysUntil, isWithinQuietHours, toDay } from "../domain/time";
import { activeMissions, activeSession, daysSince, missionProgress, nextSprintFor } from "../domain/selectors";
import { recommendNext } from "../next/engine";
import { timer } from "../timer";
import type { TimerState } from "../timer";

export type NotificationKind = "sprint_end" | "sprint_reminder" | "next_sprint" | "deadline" | "stale_mission" | "daily_mission" | "weekly_review";

export interface PlannedNotification {
  /** Stable key so re-planning replaces rather than duplicates. */
  key: string;
  kind: NotificationKind;
  at: Millis;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationProvider {
  getPermission(): Promise<"granted" | "denied" | "blocked" | "undetermined" | "unavailable">;
  requestPermission(): Promise<"granted" | "denied" | "blocked" | "unavailable">;
  schedule(n: PlannedNotification): Promise<void>;
  cancel(key: string): Promise<void>;
  cancelAll(): Promise<void>;
  scheduledKeys(): Promise<string[]>;
}

/** Push a moment out of quiet hours to the end of them. */
export function respectQuietHours(at: Millis, prefs: NotificationPrefs): Millis {
  if (!prefs.quietHours.enabled) return at;
  if (!isWithinQuietHours(at, prefs.quietHours.start, prefs.quietHours.end)) return at;
  const [eh, em] = prefs.quietHours.end.split(":").map(Number);
  const d = new Date(at);
  const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh ?? 8, em ?? 0, 0, 0).getTime();
  return candidate > at ? candidate : candidate + DAY;
}

/**
 * Everything that should be scheduled right now, from state alone. The timer
 * state is passed separately because it lives outside the persisted snapshot.
 */
export function planNotifications(state: AppState, now: Millis, timerState?: TimerState): PlannedNotification[] {
  const prefs = state.preferences.notifications;
  if (!prefs.enabled) return [];
  const out: PlannedNotification[] = [];

  // Sprint ending: this is the one notification that ignores quiet hours,
  // because the user started the sprint themselves.
  const session = activeSession(state);
  if (session && timerState && prefs.sprintReminders) {
    const reading = timer.derive(timerState, now);
    if (reading.status === "running" && reading.endsAt !== undefined) {
      const sprint = state.sprints[session.sprintId];
      out.push({
        key: `sprint_end:${session.id}`,
        kind: "sprint_end",
        at: reading.endsAt,
        title: "Sprint complete",
        body: sprint ? `${sprint.title}: time's up. Mark it done and see what's next.` : "Time's up. Mark it done and see what's next.",
        data: { sessionId: session.id, sprintId: session.sprintId },
      });
    }
    return out;
  }

  const missions = activeMissions(state);
  if (missions.length === 0) return out;

  // Tomorrow morning: today's mission.
  if (prefs.aiSuggestions) {
    const next = recommendNext(state, { now });
    if (next.best) {
      const tomorrow9 = dayStart(toDay(now + DAY)) + 9 * HOUR;
      out.push({
        key: `daily:${toDay(tomorrow9)}`,
        kind: "daily_mission",
        at: respectQuietHours(tomorrow9, prefs),
        title: "Ready for a sprint?",
        body: `${next.best.sprint.title} · ${next.best.sprint.durationMin} min · ${next.best.mission.title}`,
        data: { sprintId: next.best.sprint.id },
      });
    }
  }

  if (prefs.goalReminders) {
    for (const m of missions) {
      const p = missionProgress(state, m.id);
      if (m.deadline !== undefined && p.remaining > 0) {
        const days = daysUntil(m.deadline, now);
        if (days > 1 && days <= 8) {
          let at = respectQuietHours(dayStart(toDay(m.deadline - 2 * DAY)) + 9 * HOUR, prefs);
          // Already past the two-days-before moment: tomorrow morning, if that's still before the deadline.
          if (at <= now) at = respectQuietHours(dayStart(toDay(now + DAY)) + 9 * HOUR, prefs);
          if (at > now && at < m.deadline) {
            out.push({ key: `deadline:${m.id}`, kind: "deadline", at, title: `${m.title} is due soon`, body: `${p.remaining} sprint${p.remaining === 1 ? "" : "s"} left. Here's the simplest path forward.`, data: { missionId: m.id } });
          }
        }
      }
      const since = daysSince(m.lastActivityAt ?? m.createdAt, now) ?? 0;
      const next = nextSprintFor(state, m.id);
      if (next && since < 5) {
        const at = respectQuietHours((m.lastActivityAt ?? m.createdAt) + 5 * DAY + 10 * HOUR - ((m.lastActivityAt ?? m.createdAt) % DAY), prefs);
        if (at > now + 30 * MINUTE) {
          out.push({ key: `stale:${m.id}`, kind: "stale_mission", at, title: m.title, body: `It's been a few days. A ${next.durationMin}-minute sprint would keep it moving. No pressure.`, data: { missionId: m.id } });
        }
      }
    }
  }

  return out.sort((a, b) => a.at - b.at);
}

/** Reconciles what's scheduled with what should be. */
export async function syncNotifications(provider: NotificationProvider, planned: PlannedNotification[]): Promise<void> {
  const permission = await provider.getPermission();
  if (permission !== "granted") return;
  const existing = new Set(await provider.scheduledKeys());
  const wanted = new Set(planned.map((p) => p.key));
  for (const key of existing) if (!wanted.has(key)) await provider.cancel(key);
  for (const p of planned) {
    await provider.cancel(p.key);
    await provider.schedule(p);
  }
}
