import {
  LocalAIProvider,
  MockImageProvider,
  NoCalendarProvider,
  NoMusicProvider,
  RemoteAIProvider,
  type AIProvider,
  type Providers,
} from "@sprint/core";
import { config, hasRemoteAI } from "@/lib/config";
import { audio } from "@/platform/audio";
import { haptics } from "@/platform/haptics";
import { notifications } from "@/platform/notifications";
import { speech } from "@/platform/speech";
import { voice } from "@/platform/voice";

/**
 * The one place that decides which concrete providers the app runs with.
 * Everything is swappable; nothing here is required for the core loop.
 */
export const localAI: AIProvider = new LocalAIProvider({ latencyMs: 900 });
export const remoteAI: AIProvider | undefined = hasRemoteAI ? new RemoteAIProvider({ baseUrl: config.apiUrl, timeoutMs: 15_000 }) : undefined;

export const providers: Providers = {
  ai: remoteAI ?? localAI,
  voice,
  speech,
  audio,
  music: new NoMusicProvider(),
  image: new MockImageProvider(),
  haptics,
  calendar: new NoCalendarProvider(),
  notifications,
};

export function aiProviderFor(aiEnabled: boolean): AIProvider {
  return aiEnabled && remoteAI ? remoteAI : localAI;
}
