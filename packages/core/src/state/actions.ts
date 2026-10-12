import type { Day, Energy, GeneratedVisual, GoalSource, ID, Millis, Mission, PermissionState, Preferences, Reflection, Sprint } from "../domain/types";
import type { PlanDraft } from "../planning/types";

export type Action =
  | { type: "mission/create"; goalText: string; plan: PlanDraft; source: GoalSource; now: Millis; priority?: 1 | 2 | 3 }
  | { type: "mission/update"; missionId: ID; patch: Partial<Pick<Mission, "title" | "objective" | "priority" | "category" | "deadline" | "timeframe">>; now: Millis }
  | { type: "mission/pause"; missionId: ID; now: Millis }
  | { type: "mission/resume"; missionId: ID; now: Millis }
  | { type: "mission/archive"; missionId: ID; now: Millis }
  | { type: "mission/delete"; missionId: ID }
  | { type: "mission/complete"; missionId: ID; now: Millis }
  | { type: "mission/reflect"; missionId: ID; reflection: Omit<Reflection, "createdAt">; now: Millis }
  | { type: "mission/setVisual"; missionId: ID; visual: GeneratedVisual }
  | { type: "sprint/start"; sprintId: ID; now: Millis; minutes?: number }
  | { type: "sprint/pause"; now: Millis }
  | { type: "sprint/resume"; now: Millis }
  | { type: "sprint/extend"; now: Millis; deltaMin: number }
  | { type: "sprint/complete"; now: Millis }
  | { type: "sprint/cancel"; now: Millis }
  | { type: "sprint/skip"; sprintId: ID; now: Millis }
  | { type: "sprint/reschedule"; sprintId: ID; day: Day; now: Millis }
  | { type: "sprint/update"; sprintId: ID; patch: Partial<Pick<Sprint, "title" | "durationMin" | "detail" | "energy">>; now: Millis }
  | { type: "sprint/add"; missionId: ID; milestoneId?: ID; title: string; durationMin: number; energy?: Energy; afterSprintId?: ID; now: Millis }
  | { type: "sprint/delete"; sprintId: ID }
  | { type: "sprint/split"; sprintId: ID; now: Millis; firstMinutes?: number }
  | { type: "sprint/followUp"; sprintId: ID; minutes: number; now: Millis }
  | { type: "plan/catchUp"; now: Millis }
  | { type: "plan/reduceToday"; missionId: ID; keepMinutes: number; now: Millis }
  | { type: "plan/dismissAdjustment"; id: ID }
  | { type: "prefs/set"; patch: Partial<Preferences>; now: Millis }
  | { type: "permissions/set"; key: "microphone" | "notifications"; state: PermissionState }
  | { type: "onboarding/complete" }
  | { type: "daily/build"; now: Millis }
  | { type: "app/foreground"; now: Millis }
  | { type: "completion/clear" }
  | { type: "data/reset"; now: Millis }
  | { type: "data/replace"; state: import("../domain/types").AppState };
