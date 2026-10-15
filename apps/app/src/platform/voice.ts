import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type { PermissionState, VoiceListeners, VoiceProvider } from "@sprint/core";

/**
 * Speech recognition via the platform engine (Apple, Google, or the Web Speech
 * API). Cloud providers can replace this class without touching the UI.
 */
class PlatformVoiceProvider implements VoiceProvider {
  readonly name = Platform.OS === "web" ? "web-speech" : "platform-speech";
  private subscriptions: Array<{ remove(): void }> = [];

  async isAvailable() {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  }

  async getPermission(): Promise<PermissionState> {
    if (!(await this.isAvailable())) return "unavailable";
    if (Platform.OS === "web") return this.webPermission();
    try {
      const p = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (p.granted) return "granted";
      if (p.status === "undetermined") return "undetermined";
      return p.canAskAgain ? "denied" : "blocked";
    } catch {
      return "unavailable";
    }
  }

  async requestPermission(): Promise<PermissionState> {
    if (!(await this.isAvailable())) return "unavailable";
    // Browsers prompt when recognition starts; a denial arrives as a "not-allowed" error.
    if (Platform.OS === "web") {
      const current = await this.webPermission();
      return current === "blocked" ? "blocked" : "granted";
    }
    try {
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (p.granted) return "granted";
      return p.canAskAgain ? "denied" : "blocked";
    } catch {
      return "unavailable";
    }
  }

  async start(listeners: VoiceListeners, options: { lang?: string; continuous?: boolean } = {}) {
    this.clear();
    let finalSent = false;
    let latest = "";
    this.subscriptions.push(
      ExpoSpeechRecognitionModule.addListener("result", (event) => {
        const transcript = event.results[0]?.transcript ?? "";
        if (!transcript) return;
        latest = transcript;
        if (event.isFinal) {
          finalSent = true;
          listeners.onFinal(transcript);
        } else {
          listeners.onPartial?.(transcript);
        }
      }),
      ExpoSpeechRecognitionModule.addListener("error", (event) => {
        const code = String(event.error);
        const mapped =
          code === "not-allowed" || code === "service-not-allowed" ? "not-allowed" : code === "no-speech" ? "no-speech" : code === "network" ? "network" : code === "aborted" ? "aborted" : "unknown";
        listeners.onError(mapped);
      }),
      ExpoSpeechRecognitionModule.addListener("end", () => {
        if (!finalSent && latest) {
          finalSent = true;
          listeners.onFinal(latest);
        }
        listeners.onEnd?.();
        this.clear();
      }),
    );
    ExpoSpeechRecognitionModule.start({
      lang: options.lang ?? "en-US",
      interimResults: true,
      continuous: options.continuous ?? false,
      maxAlternatives: 1,
    });
  }

  async stop() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Not running.
    }
  }

  async abort() {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Not running.
    }
    this.clear();
  }

  /** Chrome exposes microphone state through the Permissions API; others report undetermined. */
  private async webPermission(): Promise<PermissionState> {
    try {
      const nav = globalThis.navigator as Navigator & { permissions?: { query(d: { name: string }): Promise<{ state: string }> } };
      const status = await nav.permissions?.query({ name: "microphone" });
      if (!status) return "undetermined";
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "blocked";
      return "undetermined";
    } catch {
      return "undetermined";
    }
  }

  private clear() {
    for (const s of this.subscriptions) s.remove();
    this.subscriptions = [];
  }
}

export const voice: VoiceProvider = new PlatformVoiceProvider();
