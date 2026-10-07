export type HapticEvent =
  | "sprint_start"
  | "countdown_tick"
  | "sprint_complete"
  | "milestone_complete"
  | "mission_complete"
  | "reward_unlocked"
  | "important_reminder"
  | "selection"
  | "warning";

export interface HapticsProvider {
  readonly name: string;
  trigger(event: HapticEvent): Promise<void>;
  setEnabled(enabled: boolean): void;
}

export class NoopHapticsProvider implements HapticsProvider {
  readonly name = "noop";
  async trigger() {}
  setEnabled() {}
}
