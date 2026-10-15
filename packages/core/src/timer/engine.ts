import type { Millis, Pause } from "../domain/types";

/**
 * Timer engine.
 *
 * Pure, timestamp-based. Nothing here ticks; the UI asks `derive(state, now)`
 * as often as it likes (every frame, every second, or once after the app
 * returns from the background) and always gets the right answer.
 */

export type TimerStatus = "running" | "paused" | "complete";

export interface TimerState {
  durationMs: number;
  startedAt: Millis;
  pauses: Pause[];
  /** Set once the timer is complete, whether by expiry or user action. */
  completedAt?: Millis;
  /** Highest clock value seen, so a backwards clock jump can't rewind time. */
  highWater: Millis;
}

export interface TimerReading {
  status: TimerStatus;
  remainingMs: number;
  elapsedMs: number;
  /** 0 → 1 */
  progress: number;
  /** Projected completion moment, for notifications. Undefined while paused. */
  endsAt?: Millis;
  /** True when the timer ran out while nobody was watching. */
  expired: boolean;
}

function guard(state: TimerState, now: Millis): Millis {
  return now < state.highWater ? state.highWater : now;
}

export function pausedMs(state: TimerState, now: Millis): number {
  let total = 0;
  for (const p of state.pauses) total += (p.resumedAt ?? now) - p.at;
  return total;
}

export function isPaused(state: TimerState): boolean {
  const last = state.pauses[state.pauses.length - 1];
  return !!last && last.resumedAt === undefined && state.completedAt === undefined;
}

export function start(durationMs: number, now: Millis): TimerState {
  return { durationMs, startedAt: now, pauses: [], highWater: now };
}

export function pause(state: TimerState, now: Millis): TimerState {
  if (state.completedAt !== undefined || isPaused(state)) return state;
  const t = guard(state, now);
  const reading = derive(state, t);
  if (reading.status === "complete") return complete(state, t);
  return { ...state, pauses: [...state.pauses, { at: t }], highWater: t };
}

export function resume(state: TimerState, now: Millis): TimerState {
  if (!isPaused(state)) return state;
  const t = guard(state, now);
  const pauses = state.pauses.map((p, i) => (i === state.pauses.length - 1 ? { ...p, resumedAt: t } : p));
  return { ...state, pauses, highWater: t };
}

export function complete(state: TimerState, now: Millis): TimerState {
  if (state.completedAt !== undefined) return state;
  const t = guard(state, now);
  const pauses = isPaused(state) ? state.pauses.map((p, i) => (i === state.pauses.length - 1 ? { ...p, resumedAt: t } : p)) : state.pauses;
  return { ...state, pauses, completedAt: t, highWater: t };
}

/** Add or remove time while running. Never below one minute remaining. */
export function extend(state: TimerState, deltaMs: number, now: Millis): TimerState {
  const reading = derive(state, now);
  const minDuration = reading.elapsedMs + 60_000;
  return { ...state, durationMs: Math.max(minDuration, state.durationMs + deltaMs) };
}

export function derive(state: TimerState, now: Millis): TimerReading {
  const t = guard(state, now);
  const paused = isPaused(state);
  const end = state.completedAt ?? t;
  const elapsedRaw = end - state.startedAt - pausedMs(state, end);
  const elapsedMs = Math.max(0, Math.min(state.durationMs, elapsedRaw));
  const remainingMs = Math.max(0, state.durationMs - elapsedMs);
  const progress = state.durationMs === 0 ? 1 : Math.min(1, elapsedMs / state.durationMs);

  if (state.completedAt !== undefined) {
    return { status: "complete", remainingMs: 0, elapsedMs: state.durationMs === 0 ? 0 : elapsedMs, progress: 1, expired: false };
  }
  if (remainingMs <= 0) {
    // Ran out, possibly while backgrounded. Caller decides whether to finalise.
    return { status: "complete", remainingMs: 0, elapsedMs: state.durationMs, progress: 1, expired: true };
  }
  if (paused) {
    return { status: "paused", remainingMs, elapsedMs, progress, expired: false };
  }
  return { status: "running", remainingMs, elapsedMs, progress, endsAt: t + remainingMs, expired: false };
}

/** Moment the timer will finish if nothing changes. Undefined when paused or done. */
export function projectedEnd(state: TimerState, now: Millis): Millis | undefined {
  return derive(state, now).endsAt;
}

/** The focused minutes actually spent, for stats. */
export function focusedMinutes(state: TimerState, now: Millis): number {
  return Math.round(derive(state, now).elapsedMs / 60_000);
}

/** Touch the high-water mark; call on every observed `now`. */
export function observe(state: TimerState, now: Millis): TimerState {
  return now > state.highWater ? { ...state, highWater: now } : state;
}
