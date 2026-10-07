import type { AppState, Millis, NotificationPrefs, Preferences } from "../domain/types";
import { initialMomentum } from "../momentum/momentum";

export const STATE_VERSION = 1;

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  enabled: true,
  sprintReminders: true,
  goalReminders: true,
  completion: true,
  aiSuggestions: true,
  quietHours: { enabled: true, start: "22:00", end: "08:00" },
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  motion: "system",
  haptics: true,
  sound: true,
  voice: true,
  ai: true,
  generatedVisuals: true,
  defaultSprintMin: 25,
  notifications: DEFAULT_NOTIFICATIONS,
};

export function createInitialState(now: Millis): AppState {
  return {
    version: STATE_VERSION,
    onboarded: false,
    goals: {},
    missions: {},
    milestones: {},
    sprints: {},
    sessions: {},
    achievements: [],
    momentum: initialMomentum(now),
    preferences: DEFAULT_PREFERENCES,
    permissions: { microphone: "unknown", notifications: "unknown" },
    events: [],
    pendingAdjustments: [],
  };
}
