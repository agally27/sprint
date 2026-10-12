import { useMemo } from "react";
import { recommendNext, type NextOptions, type NextResult } from "@sprint/core";
import { useStore } from "@/store/store";

export function useNext(opts: Omit<NextOptions, "now"> & { now?: number } = {}): NextResult {
  const state = useStore((s) => s.state);
  const { availableMin, exclude, preferMissionId } = opts;
  const excludeKey = (exclude ?? []).join(",");
  return useMemo(() => {
    const o: NextOptions = { now: opts.now ?? Date.now() };
    if (availableMin !== undefined) o.availableMin = availableMin;
    if (exclude) o.exclude = exclude;
    if (preferMissionId) o.preferMissionId = preferMissionId;
    return recommendNext(state, o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, availableMin, excludeKey, preferMissionId, opts.now]);
}
