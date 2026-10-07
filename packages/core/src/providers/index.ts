export * from "./ai";
export * from "./voice";
export * from "./audio";
export * from "./image";
export * from "./haptics";
export * from "./calendar";
export * from "./storage";

import type { AIProvider } from "./ai";
import type { AudioProvider, MusicProvider, SpeechProvider } from "./audio";
import type { CalendarProvider } from "./calendar";
import type { HapticsProvider } from "./haptics";
import type { ImageProvider } from "./image";
import type { VoiceProvider } from "./voice";
import type { NotificationProvider } from "../notifications/planner";

/** Everything the app needs from the outside world, in one place. */
export interface Providers {
  ai: AIProvider;
  voice: VoiceProvider;
  speech: SpeechProvider;
  audio: AudioProvider;
  music: MusicProvider;
  image: ImageProvider;
  haptics: HapticsProvider;
  calendar: CalendarProvider;
  notifications: NotificationProvider;
}
