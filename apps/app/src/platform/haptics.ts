import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import type { HapticEvent, HapticsProvider } from "@sprint/core";

/**
 * Haptics. Native uses the platform engine; web uses the Vibration API where
 * it exists. Disabled globally from preferences and never required.
 */
class PlatformHaptics implements HapticsProvider {
  readonly name = Platform.OS === "web" ? "web-vibration" : "expo-haptics";
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async trigger(event: HapticEvent) {
    if (!this.enabled) return;
    try {
      if (Platform.OS === "web") {
        const nav = globalThis.navigator as (Navigator & { vibrate?: (p: number | number[]) => boolean }) | undefined;
        if (!nav?.vibrate) return;
        const pattern: Record<HapticEvent, number | number[]> = {
          sprint_start: [20, 40, 30],
          countdown_tick: 10,
          sprint_complete: [30, 50, 30, 50, 60],
          milestone_complete: [40, 60, 80],
          mission_complete: [60, 60, 60, 60, 120],
          reward_unlocked: [20, 40, 20],
          important_reminder: [50, 100, 50],
          selection: 8,
          warning: [40, 40, 40],
        };
        nav.vibrate(pattern[event]);
        return;
      }
      switch (event) {
        case "sprint_start":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "countdown_tick":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "sprint_complete":
        case "milestone_complete":
        case "mission_complete":
        case "reward_unlocked":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "important_reminder":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "warning":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "selection":
          await Haptics.selectionAsync();
          break;
      }
    } catch {
      // Haptics are decoration. Never let them fail the interaction.
    }
  }
}

export const haptics = new PlatformHaptics();
