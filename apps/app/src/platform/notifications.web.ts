import type { NotificationProvider, PlannedNotification } from "@sprint/core";

/**
 * Web notifications are best-effort: the Notification API fires only while
 * a tab is open, which covers the one that matters most (sprint end).
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function api(): typeof Notification | undefined {
  return typeof window !== "undefined" && "Notification" in window ? window.Notification : undefined;
}

class WebNotificationProvider implements NotificationProvider {
  async getPermission() {
    const N = api();
    if (!N) return "unavailable" as const;
    if (N.permission === "granted") return "granted" as const;
    if (N.permission === "denied") return "blocked" as const;
    return "undetermined" as const;
  }

  async requestPermission() {
    const N = api();
    if (!N) return "unavailable" as const;
    try {
      const r = await N.requestPermission();
      return r === "granted" ? ("granted" as const) : r === "denied" ? ("blocked" as const) : ("denied" as const);
    } catch {
      return "unavailable" as const;
    }
  }

  async schedule(n: PlannedNotification) {
    const N = api();
    if (!N || N.permission !== "granted") return;
    const delay = n.at - Date.now();
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
    this.cancel(n.key);
    timers.set(
      n.key,
      setTimeout(() => {
        try {
          new N(n.title, { body: n.body, tag: n.key, silent: false });
        } catch {
          // Ignore: the tab may be closing.
        }
        timers.delete(n.key);
      }, delay),
    );
  }

  async cancel(key: string) {
    const t = timers.get(key);
    if (t) clearTimeout(t);
    timers.delete(key);
  }

  async cancelAll() {
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  }

  async scheduledKeys() {
    return [...timers.keys()];
  }
}

export const notifications: NotificationProvider = new WebNotificationProvider();
