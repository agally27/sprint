import { useEffect, useId } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

/**
 * Keeps the screen awake while mounted, tolerating the two races the stock
 * hook does not: unmounting before the (web) wake lock has activated, and a
 * lock that finishes activating after unmount.
 */
export function useKeepAwakeSafe() {
  const tag = useId();
  useEffect(() => {
    let mounted = true;
    activateKeepAwakeAsync(tag)
      .then(() => {
        if (!mounted) deactivateKeepAwake(tag).catch(() => {});
      })
      .catch(() => {});
    return () => {
      mounted = false;
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, [tag]);
}
