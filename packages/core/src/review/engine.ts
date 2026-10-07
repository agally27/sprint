import type { Achievement, AppState, Day, ID, Millis } from "../domain/types";
import { addDays, dayStart, formatMinutes, toDay } from "../domain/time";
import { ACHIEVEMENT_COPY } from "../momentum/momentum";
import { completedSprints, missionProgress } from "../domain/selectors";

export interface WeeklyReview {
  weekStart: Day;
  weekEnd: Day;
  sprintsCompleted: number;
  focusedMinutes: number;
  missionsProgressed: Array<{ id: ID; title: string; completedSprints: number; progress: number; completed: boolean }>;
  missionsCompleted: number;
  milestonesCompleted: number;
  activeDays: number;
  momentumScore: number;
  biggestAchievement?: Achievement & { title: string; detail: string };
  reflection: string;
  nextPriority?: { missionId: ID; title: string };
  /** Sprints per day Monday→Sunday for a small chart. */
  perDay: number[];
}

/** Monday of the week containing `at`. */
export function weekStartOf(at: Millis): Day {
  const d = new Date(at);
  const dow = d.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(toDay(at), -back);
}

export function weeklyReview(state: AppState, now: Millis, weekStart: Day = weekStartOf(now)): WeeklyReview {
  const start = dayStart(weekStart);
  const end = dayStart(addDays(weekStart, 7));
  const inWeek = completedSprints(state).filter((s) => (s.completedAt ?? 0) >= start && (s.completedAt ?? 0) < end);
  const minutes = inWeek.reduce((a, s) => a + (s.actualMinutes ?? s.durationMin), 0);

  const byMission = new Map<ID, number>();
  for (const s of inWeek) byMission.set(s.missionId, (byMission.get(s.missionId) ?? 0) + 1);
  const missionsProgressed = [...byMission.entries()]
    .map(([id, count]) => {
      const m = state.missions[id];
      const p = missionProgress(state, id);
      return { id, title: m?.title ?? "Mission", completedSprints: count, progress: p.ratio, completed: m?.status === "completed" };
    })
    .sort((a, b) => b.completedSprints - a.completedSprints);

  const missionsCompleted = Object.values(state.missions).filter((m) => m.completedAt !== undefined && m.completedAt >= start && m.completedAt < end).length;
  const milestonesCompleted = Object.values(state.milestones).filter((m) => m.completedAt !== undefined && m.completedAt >= start && m.completedAt < end).length;
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return inWeek.filter((s) => toDay(s.completedAt!) === day).length;
  });
  const activeDays = perDay.filter((n) => n > 0).length;

  const weekAchievements = state.achievements.filter((a) => a.unlockedAt >= start && a.unlockedAt < end);
  const rank: Record<string, number> = { first_mission: 10, first_milestone: 7, consistent_week: 6, comeback: 6, ten_hours: 5, deep_focus: 4, strong_day: 4, momentum_strong: 3, twenty_five_sprints: 3, five_sprints: 2, first_sprint: 1 };
  const biggest = [...weekAchievements].sort((a, b) => (rank[b.key] ?? 0) - (rank[a.key] ?? 0))[0];

  const topMission = missionsProgressed[0];
  const reflection = (() => {
    if (inWeek.length === 0) return "A quiet week. That's allowed. One short sprint is enough to get moving again.";
    const parts = [`You completed ${inWeek.length} sprint${inWeek.length === 1 ? "" : "s"} this week, ${formatMinutes(minutes)} of focused work`];
    if (topMission) {
      const pct = Math.round(topMission.progress * 100);
      parts.push(topMission.completed ? `and finished ${topMission.title}.` : `and moved ${topMission.title} to ${pct}%.`);
    } else parts.push(".");
    if (activeDays >= 5) parts.push("Five active days is real consistency.");
    else if (activeDays >= 3) parts.push(`Three or more active days. Momentum is holding.`);
    return parts.join(" ").replace(/ \./g, ".");
  })();

  const active = Object.values(state.missions).filter((m) => m.status === "active");
  const nextPriority = active.sort((a, b) => a.priority - b.priority || (a.deadline ?? Infinity) - (b.deadline ?? Infinity))[0];

  const review: WeeklyReview = {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    sprintsCompleted: inWeek.length,
    focusedMinutes: minutes,
    missionsProgressed,
    missionsCompleted,
    milestonesCompleted,
    activeDays,
    momentumScore: state.momentum.score,
    reflection,
    perDay,
  };
  if (biggest) review.biggestAchievement = { ...biggest, ...ACHIEVEMENT_COPY[biggest.key] };
  if (nextPriority) review.nextPriority = { missionId: nextPriority.id, title: nextPriority.title };
  return review;
}

export interface Stats {
  sprintsCompleted: number;
  focusedMinutes: number;
  missionsCompleted: number;
  missionCompletionRate: number;
  averageSprintMin: number;
  activeDaysLast30: number;
  /** Minutes by mission id. */
  minutesByMission: Array<{ missionId: ID; title: string; minutes: number; category: string }>;
  /** Focused minutes per day for the last 28 days, oldest first. */
  last28Days: Array<{ day: Day; minutes: number; sprints: number }>;
}

export function stats(state: AppState, now: Millis): Stats {
  const done = completedSprints(state);
  const minutes = done.reduce((a, s) => a + (s.actualMinutes ?? s.durationMin), 0);
  const missions = Object.values(state.missions).filter((m) => m.status !== "archived");
  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const byMission = new Map<ID, number>();
  for (const s of done) byMission.set(s.missionId, (byMission.get(s.missionId) ?? 0) + (s.actualMinutes ?? s.durationMin));
  const today = toDay(now);
  const last28Days = Array.from({ length: 28 }, (_, i) => {
    const day = addDays(today, i - 27);
    const inDay = done.filter((s) => toDay(s.completedAt!) === day);
    return { day, minutes: inDay.reduce((a, s) => a + (s.actualMinutes ?? s.durationMin), 0), sprints: inDay.length };
  });
  return {
    sprintsCompleted: done.length,
    focusedMinutes: minutes,
    missionsCompleted: completedMissions,
    missionCompletionRate: missions.length === 0 ? 0 : completedMissions / missions.length,
    averageSprintMin: done.length === 0 ? 0 : Math.round(minutes / done.length),
    activeDaysLast30: new Set(done.filter((s) => (s.completedAt ?? 0) >= now - 30 * 86_400_000).map((s) => toDay(s.completedAt!))).size,
    minutesByMission: [...byMission.entries()]
      .map(([missionId, m]) => ({ missionId, title: state.missions[missionId]?.title ?? "Mission", minutes: m, category: state.missions[missionId]?.category ?? "other" }))
      .sort((a, b) => b.minutes - a.minutes),
    last28Days,
  };
}
