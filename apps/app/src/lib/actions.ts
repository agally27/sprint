import { router } from "expo-router";
import { haptics } from "@/platform/haptics";

/**
 * Enter focus mode for a sprint. The timer starts only after the 3-2-1
 * countdown, so the countdown never eats into the sprint.
 */
export function startSprint(sprintId: string, minutes?: number) {
  haptics.trigger("selection");
  const params: Record<string, string> = { sprintId };
  if (minutes !== undefined) params.minutes = String(minutes);
  router.push({ pathname: "/focus", params });
}
