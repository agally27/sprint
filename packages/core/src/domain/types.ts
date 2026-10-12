/**
 * Sprint domain model.
 *
 * Everything here is platform-agnostic and serialisable. Timestamps are
 * epoch milliseconds; calendar days are "YYYY-MM-DD" strings in local time.
 */

export type ID = string;
export type Millis = number;
/** Local calendar day, e.g. "2026-10-07". */
export type Day = string;

export type MissionCategory =
  | "work"
  | "health"
  | "personal"
  | "learning"
  | "creative"
  | "finance"
  | "home"
  | "other";

export const MISSION_CATEGORIES: MissionCategory[] = [
  "work",
  "health",
  "personal",
  "learning",
  "creative",
  "finance",
  "home",
  "other",
];

export type Timeframe = "today" | "week" | "month" | "custom" | "long_term";

export type GoalSource = "typed" | "voice" | "suggested" | "demo" | "import";

export interface Goal {
  id: ID;
  /** The user's own words, kept verbatim. */
  text: string;
  source: GoalSource;
  createdAt: Millis;
}

export type MissionStatus = "draft" | "active" | "paused" | "completed" | "archived";

/** Derived, never stored. */
export type MissionHealth = "ahead" | "on_track" | "at_risk" | "open" | "completed";

export interface Mission {
  id: ID;
  goalId: ID;
  title: string;
  objective: string;
  category: MissionCategory;
  status: MissionStatus;
  /** 1 = most important. */
  priority: 1 | 2 | 3;
  timeframe: Timeframe;
  deadline?: Millis;
  /** Why the plan looks the way it does. One or two sentences. */
  explanation?: string;
  planSource: "local" | "ai" | "manual";
  createdAt: Millis;
  updatedAt: Millis;
  completedAt?: Millis;
  lastActivityAt?: Millis;
  visual?: GeneratedVisual;
  reflection?: Reflection;
}

export type MilestoneStatus = "pending" | "active" | "completed";

export interface Milestone {
  id: ID;
  missionId: ID;
  title: string;
  order: number;
  status: MilestoneStatus;
  completedAt?: Millis;
}

export type SprintStatus = "planned" | "active" | "completed" | "skipped";

/** How much cognitive load a sprint asks for. Drives sizing and recovery advice. */
export type Energy = "light" | "focused" | "deep";

export interface Sprint {
  id: ID;
  missionId: ID;
  milestoneId: ID;
  title: string;
  detail?: string;
  durationMin: number;
  /** Global order within the mission. */
  order: number;
  status: SprintStatus;
  energy: Energy;
  scheduledFor?: Day;
  completedAt?: Millis;
  actualMinutes?: number;
  /** Set when this sprint was produced by splitting another. */
  splitFrom?: ID;
}

export interface Pause {
  at: Millis;
  resumedAt?: Millis;
}

export type SessionOutcome = "completed" | "cancelled" | "expired";

/** One timed run of a sprint. */
export interface SprintSession {
  id: ID;
  sprintId: ID;
  missionId: ID;
  durationMs: number;
  startedAt: Millis;
  pauses: Pause[];
  endedAt?: Millis;
  outcome?: SessionOutcome;
  /** Highest clock value observed; protects the timer from clock jumps. */
  lastSeenAt: Millis;
}

export type AchievementKey =
  | "first_sprint"
  | "first_milestone"
  | "first_mission"
  | "five_sprints"
  | "twenty_five_sprints"
  | "deep_focus"
  | "comeback"
  | "consistent_week"
  | "strong_day"
  | "momentum_strong"
  | "ten_hours";

export interface Achievement {
  key: AchievementKey;
  unlockedAt: Millis;
  missionId?: ID;
}

export interface MomentumState {
  /** 0–100. Grows with meaningful sprints, cools slowly, never snaps to zero. */
  score: number;
  /** Lifetime focused minutes. Drives level. */
  focusMinutes: number;
  updatedAt: Millis;
}

export interface QuietHours {
  enabled: boolean;
  /** "22:00" */
  start: string;
  /** "08:00" */
  end: string;
}

export interface NotificationPrefs {
  enabled: boolean;
  sprintReminders: boolean;
  goalReminders: boolean;
  completion: boolean;
  aiSuggestions: boolean;
  quietHours: QuietHours;
}

export type ThemePref = "system" | "light" | "dark";
export type MotionPref = "system" | "reduced" | "full";

export interface Preferences {
  name?: string;
  theme: ThemePref;
  motion: MotionPref;
  haptics: boolean;
  sound: boolean;
  voice: boolean;
  ai: boolean;
  generatedVisuals: boolean;
  defaultSprintMin: number;
  notifications: NotificationPrefs;
}

export type PermissionState =
  | "unknown"
  | "undetermined"
  | "granted"
  | "denied"
  | "blocked"
  | "unavailable";

export interface Permissions {
  microphone: PermissionState;
  notifications: PermissionState;
}

export interface Reflection {
  helped?: string;
  obstacles?: string;
  change?: string;
  createdAt: Millis;
}

export interface GeneratedVisual {
  /** Provider identifier, e.g. "mock", "openai", "stability". */
  provider: string;
  /** Remote URL or a local asset reference. */
  uri?: string;
  /** Seed-based fallback so missions always have a visual identity. */
  palette: [string, string];
  prompt?: string;
  createdAt: Millis;
}

export type ActivityType =
  | "goal_created"
  | "mission_created"
  | "mission_completed"
  | "mission_paused"
  | "mission_resumed"
  | "mission_archived"
  | "milestone_completed"
  | "sprint_started"
  | "sprint_paused"
  | "sprint_resumed"
  | "sprint_completed"
  | "sprint_cancelled"
  | "sprint_expired"
  | "sprint_skipped"
  | "sprint_rescheduled"
  | "sprint_split"
  | "plan_adjusted"
  | "achievement_unlocked"
  | "reflection_added";

export interface ActivityEvent {
  id: ID;
  type: ActivityType;
  at: Millis;
  missionId?: ID;
  sprintId?: ID;
  minutes?: number;
  note?: string;
}

export interface DailyMission {
  day: Day;
  /** First is the important one, the rest are optional. */
  sprintIds: ID[];
}

export interface AppState {
  version: number;
  onboarded: boolean;
  goals: Record<ID, Goal>;
  missions: Record<ID, Mission>;
  milestones: Record<ID, Milestone>;
  sprints: Record<ID, Sprint>;
  sessions: Record<ID, SprintSession>;
  activeSessionId?: ID;
  achievements: Achievement[];
  momentum: MomentumState;
  preferences: Preferences;
  permissions: Permissions;
  events: ActivityEvent[];
  dailyMission?: DailyMission;
  /** Adjustments the planner made that the user has not yet seen. */
  pendingAdjustments: PlanAdjustment[];
  /** What the last completed sprint earned, for the completion screen. */
  lastCompletion?: CompletionSummary;
}

export interface CompletionSummary {
  sessionId: ID;
  sprintId: ID;
  missionId: ID;
  at: Millis;
  focusedMinutes: number;
  expired: boolean;
  momentumBefore: number;
  momentumAfter: number;
  momentumGain: number;
  achievements: AchievementKey[];
  milestoneCompleted?: { id: ID; title: string };
  missionCompleted: boolean;
  missionProgress: { completed: number; total: number; ratio: number };
  line: string;
}

export type AdjustmentKind = "rescheduled" | "split" | "ahead" | "deadline_near" | "reduced";

export interface PlanAdjustment {
  id: ID;
  kind: AdjustmentKind;
  missionId: ID;
  message: string;
  at: Millis;
}

export const SPRINT_DURATIONS = [5, 10, 15, 25, 45, 60, 90] as const;
export type SprintDuration = (typeof SPRINT_DURATIONS)[number];
