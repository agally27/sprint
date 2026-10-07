import { useEffect, useRef } from "react";
import { AppState as RNAppState, Platform } from "react-native";
import { activeSession, planNotifications, sessionTimer, syncNotifications, timer } from "@sprint/core";
import { persistNow, useStore } from "./store";
import { providers } from "./providers";

/**
 * Side effects that follow state: foreground reconciliation, persistence
 * flushes, provider enable flags, notification sync, timer expiry.
 */
export function useAppEffects() {
  const dispatch = useStore((s) => s.dispatch);
  const hydrated = useStore((s) => s.hydrated);
  const prefs = useStore((s) => s.state.preferences);
  const session = useStore((s) => activeSession(s.state));
  const state = useStore((s) => s.state);
  const lastSynced = useRef<string>("");

  // Foreground / background.
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (status) => {
      if (status === "active") dispatch({ type: "app/foreground", now: Date.now() });
      else persistNow();
    });
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") dispatch({ type: "app/foreground", now: Date.now() });
      else persistNow();
    };
    if (Platform.OS === "web" && typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
    return () => {
      sub.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dispatch]);

  // Preferences → providers.
  useEffect(() => {
    providers.haptics.setEnabled(prefs.haptics);
    providers.audio.setEnabled(prefs.sound);
  }, [prefs.haptics, prefs.sound]);

  // Timer expiry while the app is open: finalise so the completion screen can show.
  useEffect(() => {
    if (!session) return;
    const check = () => {
      const r = timer.derive(sessionTimer(session), Date.now());
      if (r.status === "complete" && r.expired) dispatch({ type: "sprint/complete", now: Date.now() });
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [session, dispatch]);

  // Notifications follow state, cheaply: only when the relevant inputs change.
  useEffect(() => {
    if (!hydrated) return;
    const planned = planNotifications(state, Date.now(), session ? sessionTimer(session) : undefined);
    const signature = JSON.stringify(planned.map((p) => [p.key, p.at]));
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    syncNotifications(providers.notifications, planned).catch(() => {});
  }, [hydrated, state, session]);
}
