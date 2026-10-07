import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { AudioProvider, SoundEvent } from "@sprint/core";

/**
 * Sound effects. Small bundled tones, played through expo-audio on every
 * platform. Silent when disabled, never required.
 */
const SOURCES: Record<SoundEvent, number> = {
  countdown_tick: require("../../assets/sounds/tick.wav"),
  sprint_start: require("../../assets/sounds/start.wav"),
  sprint_complete: require("../../assets/sounds/complete.wav"),
  milestone_complete: require("../../assets/sounds/milestone.wav"),
  mission_complete: require("../../assets/sounds/milestone.wav"),
  achievement: require("../../assets/sounds/complete.wav"),
};

class PlatformAudioProvider implements AudioProvider {
  readonly name = "expo-audio";
  private enabled = true;
  private players = new Map<SoundEvent, AudioPlayer>();
  private modeReady = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async play(event: SoundEvent) {
    if (!this.enabled) return;
    try {
      if (!this.modeReady && Platform.OS !== "web") {
        this.modeReady = true;
        await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" });
      }
      let player = this.players.get(event);
      if (!player) {
        player = createAudioPlayer(SOURCES[event]);
        player.volume = event === "countdown_tick" ? 0.5 : 0.8;
        this.players.set(event, player);
      }
      player.seekTo(0);
      player.play();
    } catch {
      // Audio is optional. A missing codec or an autoplay policy must never break a sprint.
    }
  }
}

export const audio: AudioProvider = new PlatformAudioProvider();
