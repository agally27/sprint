import type { Millis } from "../domain/types";

export interface FreeWindow {
  start: Millis;
  end: Millis;
  minutes: number;
}

/**
 * Calendar awareness. Future providers (Apple, Google, Outlook) answer one
 * question: how much uninterrupted time does the user have right now?
 */
export interface CalendarProvider {
  readonly name: string;
  isConnected(): Promise<boolean>;
  nextFreeWindow(now: Millis, lookaheadMin?: number): Promise<FreeWindow | undefined>;
}

export class NoCalendarProvider implements CalendarProvider {
  readonly name = "none";
  async isConnected() {
    return false;
  }
  async nextFreeWindow() {
    return undefined;
  }
}
