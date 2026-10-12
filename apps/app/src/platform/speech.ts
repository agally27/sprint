import * as Speech from "expo-speech";
import type { SpeechProvider } from "@sprint/core";

/** Spoken lines via the platform voice. ElevenLabs can replace this through the API. */
class PlatformSpeechProvider implements SpeechProvider {
  readonly name = "platform-tts";
  async speak(text: string, options: { rate?: number } = {}) {
    try {
      Speech.speak(text, { rate: options.rate ?? 0.95 });
    } catch {
      // Speech is optional.
    }
  }
  async stop() {
    try {
      await Speech.stop();
    } catch {
      // Not speaking.
    }
  }
}

export const speech: SpeechProvider = new PlatformSpeechProvider();
