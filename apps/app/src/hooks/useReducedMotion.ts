import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useStore } from "@/store/store";

/** Combines the OS reduce-motion setting with the in-app preference. */
export function useReducedMotion(): boolean {
  const pref = useStore((s) => s.state.preferences.motion);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setSystem(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => setSystem(!!v));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  if (pref === "reduced") return true;
  if (pref === "full") return false;
  return system;
}
