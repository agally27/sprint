import type { AppState } from "../domain/types";
import type { StorageAdapter } from "../providers/storage";
import { createInitialState, DEFAULT_PREFERENCES, STATE_VERSION } from "./initial";

export const STORAGE_KEY = "sprint.state.v1";

export function serialize(state: AppState): string {
  // Events are the only unbounded collection; keep the snapshot lean.
  return JSON.stringify({ ...state, events: state.events.slice(-500) });
}

/** Brings any older snapshot up to the current shape. Tolerant of garbage. */
export function migrate(raw: unknown, now: number): AppState {
  const base = createInitialState(now);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AppState> & { version?: number };
  const state: AppState = {
    ...base,
    ...r,
    version: STATE_VERSION,
    goals: r.goals ?? {},
    missions: r.missions ?? {},
    milestones: r.milestones ?? {},
    sprints: r.sprints ?? {},
    sessions: r.sessions ?? {},
    achievements: r.achievements ?? [],
    momentum: r.momentum ?? base.momentum,
    preferences: { ...DEFAULT_PREFERENCES, ...(r.preferences ?? {}), notifications: { ...DEFAULT_PREFERENCES.notifications, ...(r.preferences?.notifications ?? {}) } },
    permissions: { ...base.permissions, ...(r.permissions ?? {}) },
    events: r.events ?? [],
    pendingAdjustments: r.pendingAdjustments ?? [],
  };
  // Sessions written before lastSeenAt existed.
  for (const s of Object.values(state.sessions)) if (typeof s.lastSeenAt !== "number") s.lastSeenAt = s.startedAt;
  // A dangling active session is dropped rather than trusted.
  if (state.activeSessionId && !state.sessions[state.activeSessionId]) delete state.activeSessionId;
  return state;
}

export function deserialize(json: string | null, now: number): AppState {
  if (!json) return createInitialState(now);
  try {
    return migrate(JSON.parse(json), now);
  } catch {
    return createInitialState(now);
  }
}

export async function loadState(storage: StorageAdapter, now: number): Promise<AppState> {
  return deserialize(await storage.getItem(STORAGE_KEY), now);
}

export async function saveState(storage: StorageAdapter, state: AppState): Promise<void> {
  await storage.setItem(STORAGE_KEY, serialize(state));
}

export async function clearState(storage: StorageAdapter): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}
