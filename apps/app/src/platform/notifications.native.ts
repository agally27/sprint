import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { NotificationProvider, PlannedNotification } from "@sprint/core";

/**
 * Local notifications via expo-notifications. Keys map to identifiers so the
 * planner can replace a notification without duplicating it.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelReady = false;
async function ensureChannel() {
  if (channelReady || Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("sprints", {
    name: "Sprints",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 120, 80, 120],
    lightColor: "#FF6B3D",
  });
  channelReady = true;
}

function mapStatus(status: Notifications.PermissionStatus, canAskAgain: boolean): "granted" | "denied" | "blocked" | "undetermined" {
  if (status === Notifications.PermissionStatus.GRANTED) return "granted";
  if (status === Notifications.PermissionStatus.UNDETERMINED) return "undetermined";
  return canAskAgain ? "denied" : "blocked";
}

class ExpoNotificationProvider implements NotificationProvider {
  async getPermission() {
    try {
      const p = await Notifications.getPermissionsAsync();
      return mapStatus(p.status, p.canAskAgain);
    } catch {
      return "unavailable" as const;
    }
  }

  async requestPermission() {
    try {
      const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
      const s = mapStatus(p.status, p.canAskAgain);
      return s === "undetermined" ? "denied" : s;
    } catch {
      return "unavailable" as const;
    }
  }

  async schedule(n: PlannedNotification) {
    await ensureChannel();
    if (n.at <= Date.now() + 1000) return;
    await Notifications.scheduleNotificationAsync({
      identifier: n.key,
      content: { title: n.title, body: n.body, data: { ...n.data, kind: n.kind, key: n.key }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(n.at), channelId: "sprints" },
    });
  }

  async cancel(key: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(key);
    } catch {
      // Already gone.
    }
  }

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async scheduledKeys() {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.map((n) => n.identifier);
  }
}

export const notifications: NotificationProvider = new ExpoNotificationProvider();
