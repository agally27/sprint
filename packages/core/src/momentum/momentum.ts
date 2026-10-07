import type { Achievement, AchievementKey, ActivityEvent, Millis, MomentumState, Sprint } from "../domain/types";
import { DAY, toDay } from "../domain/time";

/**
 * Momentum: how much progress you're currently carrying forward.
 *
 * It grows when you complete meaningful sprints and cools gently (half-life of
 * four days). It never snaps to zero and there is no streak to protect.
 */

export const MOMENTUM_HALF_LIFE_MS = 4 * DAY;
export const MOMENTUM_MAX = 100;

export function initialMomentum(now: Millis): MomentumState {
  return { score: 0, focusMinutes: 0, updatedAt: now };
}

/** Score after natural cooling up to `now`. */
export function cooled(state: MomentumState, now: Millis): number {
  const elapsed = Math.max(0, now - state.updatedAt);
  if (elapsed === 0 || state.score === 0) return state.score;
  const factor = Math.pow(0.5, elapsed / MOMENTUM_HALF_LIFE_MS);
  return Math.round(state.score * factor * 10) / 10;
}

export function settle(state: MomentumState, now: Millis): MomentumState {
  return { ...state, score: cooled(state, now), updatedAt: now };
}

/** Gain for one completed sprint. Longer and deeper work earns more, with diminishing returns. */
export function gainFor(sprint: Pick<Sprint, "durationMin" | "energy">, focusedMinutes: number): number {
  const minutes = Math.max(1, Math.min(sprint.durationMin, focusedMinutes || sprint.durationMin));
  const base = 6;
  const byLength = Math.min(14, (minutes / 25) * 7);
  const byEnergy = sprint.energy === "deep" ? 4 : sprint.energy === "focused" ? 2 : 0;
  return Math.round(base + byLength + byEnergy);
}

export function addCompletion(
  state: MomentumState,
  sprint: Pick<Sprint, "durationMin" | "energy">,
  focusedMinutes: number,
  now: Millis,
): { next: MomentumState; gain: number } {
  const current = cooled(state, now);
  const rawGain = gainFor(sprint, focusedMinutes);
  // Diminishing returns near the top keep the number meaningful.
  const headroom = (MOMENTUM_MAX - current) / MOMENTUM_MAX;
  const gain = Math.max(1, Math.round(rawGain * (0.35 + 0.65 * headroom)));
  const score = Math.min(MOMENTUM_MAX, Math.round((current + gain) * 10) / 10);
  return {
    next: { score, focusMinutes: state.focusMinutes + Math.max(0, Math.round(focusedMinutes)), updatedAt: now },
    gain,
  };
}

export type MomentumBand = "warming" | "building" | "rolling" | "strong" | "peak";

export function band(score: number): MomentumBand {
  if (score >= 90) return "peak";
  if (score >= 70) return "strong";
  if (score >= 45) return "rolling";
  if (score >= 20) return "building";
  return "warming";
}

export const BAND_LABELS: Record<MomentumBand, string> = {
  warming: "Warming up",
  building: "Building",
  rolling: "Rolling",
  strong: "Strong",
  peak: "Peak",
};

/** Levels are earned from lifetime focused minutes. Thresholds are cumulative. */
export const LEVEL_THRESHOLDS = [0, 60, 180, 420, 900, 1800, 3000, 4800, 7200, 10800, 15000];

export const LEVEL_NAMES = [
  "Starter",
  "Mover",
  "Builder",
  "Finisher",
  "Pacer",
  "Driver",
  "Sustainer",
  "Pathfinder",
  "Forerunner",
  "Trailblazer",
  "Vanguard",
];

export interface LevelInfo {
  level: number;
  name: string;
  /** Minutes into this level. */
  into: number;
  /** Minutes needed to reach the next level, or undefined at the top. */
  span?: number;
  progress: number;
}

export function levelFor(focusMinutes: number): LevelInfo {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (focusMinutes >= (LEVEL_THRESHOLDS[i] ?? 0)) level = i;
  }
  const floor = LEVEL_THRESHOLDS[level] ?? 0;
  const ceiling = LEVEL_THRESHOLDS[level + 1];
  const into = focusMinutes - floor;
  const info: LevelInfo = {
    level: level + 1,
    name: LEVEL_NAMES[level] ?? "Vanguard",
    into,
    progress: ceiling === undefined ? 1 : Math.min(1, into / (ceiling - floor)),
  };
  if (ceiling !== undefined) info.span = ceiling - floor;
  return info;
}

export interface AchievementContext {
  now: Millis;
  completedSprints: Sprint[];
  justCompleted: Sprint;
  focusedMinutes: number;
  momentumScore: number;
  lifetimeFocusMinutes: number;
  milestoneCompleted: boolean;
  missionCompleted: boolean;
  events: ActivityEvent[];
  existing: Achievement[];
}

export const ACHIEVEMENT_COPY: Record<AchievementKey, { title: string; detail: string }> = {
  first_sprint: { title: "First sprint", detail: "You started. That's the hard part." },
  first_milestone: { title: "First milestone", detail: "A whole stage of a mission, done." },
  first_mission: { title: "Mission complete", detail: "You took a goal all the way." },
  five_sprints: { title: "Five sprints", detail: "A habit is forming." },
  twenty_five_sprints: { title: "Twenty-five sprints", detail: "Serious ground covered." },
  deep_focus: { title: "Deep focus", detail: "An hour or more in one sitting." },
  comeback: { title: "Comeback", detail: "You came back after a break. That counts double." },
  consistent_week: { title: "Consistent week", detail: "Sprints on five different days this week." },
  strong_day: { title: "Strong day", detail: "Three sprints in a single day." },
  momentum_strong: { title: "Strong momentum", detail: "Momentum above seventy." },
  ten_hours: { title: "Ten hours", detail: "Ten hours of focused work, in total." },
};

/** Which achievements this completion unlocks. Never re-awards. */
export function evaluateAchievements(ctx: AchievementContext): Achievement[] {
  const have = new Set(ctx.existing.map((a) => a.key));
  const unlocked: Achievement[] = [];
  const award = (key: AchievementKey, missionId?: string) => {
    if (have.has(key)) return;
    have.add(key);
    const a: Achievement = { key, unlockedAt: ctx.now };
    if (missionId) a.missionId = missionId;
    unlocked.push(a);
  };

  const total = ctx.completedSprints.length;
  if (total >= 1) award("first_sprint", ctx.justCompleted.missionId);
  if (total >= 5) award("five_sprints");
  if (total >= 25) award("twenty_five_sprints");
  if (ctx.focusedMinutes >= 60) award("deep_focus", ctx.justCompleted.missionId);
  if (ctx.milestoneCompleted) award("first_milestone", ctx.justCompleted.missionId);
  if (ctx.missionCompleted) award("first_mission", ctx.justCompleted.missionId);
  if (ctx.momentumScore >= 70) award("momentum_strong");
  if (ctx.lifetimeFocusMinutes >= 600) award("ten_hours");

  const today = toDay(ctx.now);
  const todayCount = ctx.completedSprints.filter((s) => s.completedAt !== undefined && toDay(s.completedAt) === today).length;
  if (todayCount >= 3) award("strong_day");

  const weekAgo = ctx.now - 7 * DAY;
  const days = new Set(
    ctx.completedSprints.filter((s) => s.completedAt !== undefined && s.completedAt >= weekAgo).map((s) => toDay(s.completedAt!)),
  );
  if (days.size >= 5) award("consistent_week");

  // Comeback: previous completion was five or more days ago.
  const previous = ctx.completedSprints
    .filter((s) => s.id !== ctx.justCompleted.id && s.completedAt !== undefined)
    .map((s) => s.completedAt!)
    .sort((a, b) => b - a)[0];
  if (previous !== undefined && ctx.now - previous >= 5 * DAY) award("comeback", ctx.justCompleted.missionId);

  return unlocked;
}
