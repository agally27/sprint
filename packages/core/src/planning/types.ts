import type { Energy, Millis, MissionCategory, Timeframe } from "../domain/types";

export type Archetype =
  | "website"
  | "app"
  | "book"
  | "writing"
  | "dissertation"
  | "exam"
  | "running"
  | "fitness"
  | "strength"
  | "language"
  | "skill"
  | "home"
  | "business"
  | "presentation"
  | "finance"
  | "job"
  | "event"
  | "generic";

export interface ParsedGoal {
  /** Original text, trimmed. */
  raw: string;
  /** Cleaned statement of what the user wants, without the time phrase. */
  objective: string;
  archetype: Archetype;
  category: MissionCategory;
  /** Absolute deadline (end of that local day) when one was understood. */
  deadline?: Millis;
  /** Human reading of the deadline phrase, e.g. "Christmas". */
  deadlinePhrase?: string;
  /** Suggested timeframe when no explicit deadline was given. */
  timeframeHint?: Timeframe;
  /** 0–1. Low confidence means a clarifying question is worth asking. */
  confidence: number;
}

export interface Clarification {
  question: string;
  options: Array<{ label: string; value: string }>;
}

export interface DraftSprint {
  title: string;
  detail?: string;
  durationMin: number;
  energy: Energy;
}

export interface DraftMilestone {
  title: string;
  sprints: DraftSprint[];
}

/**
 * Provider-neutral plan. Produced by the local planner and by AI providers,
 * so the rest of the app never cares where a plan came from.
 */
export interface PlanDraft {
  title: string;
  objective: string;
  category: MissionCategory;
  timeframe: Timeframe;
  deadline?: Millis;
  explanation: string;
  milestones: DraftMilestone[];
  clarification?: Clarification;
  source: "local" | "ai";
}

export interface PlanRequest {
  goalText: string;
  /** Chosen on the timeframe step; ignored if the goal text carried a deadline. */
  timeframe?: Timeframe;
  /** Custom deadline chosen by the user. */
  deadline?: Millis;
  /** Answer to a previous clarification. */
  clarificationAnswer?: string;
  now: Millis;
}
