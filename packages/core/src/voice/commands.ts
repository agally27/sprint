import type { PermissionState } from "../domain/types";

/**
 * Voice commands. Transcripts come from any VoiceProvider (platform speech
 * recognition, a cloud provider, or a text field in tests) and are mapped to
 * product intents here, so the app never depends on one recogniser.
 */

export type VoiceIntent =
  | { type: "start_next" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "complete" }
  | { type: "cancel" }
  | { type: "whats_next" }
  | { type: "sprint_for"; minutes: number }
  | { type: "available_time"; minutes: number }
  | { type: "create_goal"; text: string }
  | { type: "move_to_tomorrow" }
  | { type: "how_am_i_doing" }
  | { type: "priority" }
  | { type: "take_break" }
  | { type: "unknown"; text: string };

const NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, "twenty five": 25, "twenty-five": 25, thirty: 30, forty: 40,
  "forty five": 45, "forty-five": 45, fifty: 50, sixty: 60, ninety: 90, half: 30, quarter: 15,
};

function minutesIn(text: string): number | undefined {
  const m = text.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty[- ]five|twenty|thirty|forty[- ]five|forty|fifty|sixty|ninety)\s*(?:-|\s)?(min|mins|minute|minutes|m\b)/);
  if (m) {
    const raw = m[1] ?? "";
    return Number.isNaN(Number(raw)) ? NUM[raw] : Number(raw);
  }
  const h = text.match(/(an?|one|two|half an?|\d+)\s*(hour|hours|hr|hrs)/);
  if (h) {
    const raw = h[1] ?? "";
    if (raw.startsWith("half")) return 30;
    const n = raw === "a" || raw === "an" || raw === "one" ? 1 : raw === "two" ? 2 : Number(raw);
    return Number.isNaN(n) ? undefined : n * 60;
  }
  if (/\bquarter of an hour\b/.test(text)) return 15;
  if (/\bhalf an hour\b/.test(text)) return 30;
  return undefined;
}

export function parseVoiceCommand(transcript: string): VoiceIntent {
  const t = transcript.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return { type: "unknown", text: transcript };

  if (/^(pause|hold on|wait|stop for a (sec|second|moment))\b/.test(t) || /\bpause\b/.test(t)) return { type: "pause" };
  if (/\b(resume|continue|carry on|keep going|unpause)\b/.test(t)) return { type: "resume" };
  if (/\b(cancel|abandon|quit)( this| the)?( sprint)?\b/.test(t)) return { type: "cancel" };
  if (/\b(done|finished|complete|completed|mark (it|this|the sprint) (as )?(done|complete)|i'?m done)\b/.test(t) && !/\bwhat\b/.test(t)) return { type: "complete" };
  if (/\b(take|need|want)( a)? break\b/.test(t) || /\bbreak time\b/.test(t)) return { type: "take_break" };
  if (/\b(what'?s|what is|whats) (my )?(next|up next)\b/.test(t) || /\bwhat (should|do|can) i do( next| now)?\b/.test(t) || /\bwhat next\b/.test(t)) return { type: "whats_next" };
  if (/\b(how am i doing|how'?s it going|progress report|how is it going|how'?s my progress)\b/.test(t)) return { type: "how_am_i_doing" };
  if (/\b(biggest|top|main) priority\b/.test(t) || /\bwhat matters most\b/.test(t)) return { type: "priority" };
  if (/\b(move|push|shift|postpone) (this|it|that)( one)? (to )?tomorrow\b/.test(t) || /\btomorrow\b/.test(t) && /\b(move|push|postpone|shift)\b/.test(t)) return { type: "move_to_tomorrow" };

  const minutes = minutesIn(t);
  if (minutes !== undefined) {
    if (/\b(give me|start|run|do|let'?s do|set)\b/.test(t) && /\bsprint\b/.test(t)) return { type: "sprint_for", minutes };
    if (/\b(i have|i'?ve got|i got|got|i only have|there'?s)\b/.test(t)) return { type: "available_time", minutes };
    if (/\bsprint\b/.test(t)) return { type: "sprint_for", minutes };
  }

  if (/\b(start|begin|go|kick off|launch)( my| the)?( next)?( sprint)?\b/.test(t) && /\b(sprint|next)\b/.test(t)) return { type: "start_next" };
  if (/^(start|go|begin)$/.test(t)) return { type: "start_next" };

  const goal = t.match(/^(?:(?:new goal|add a goal|create a goal|create a sprint from this|make a goal|goal)[:,]?\s+)(.+)$/);
  if (goal?.[1]) return { type: "create_goal", text: goal[1] };
  if (/^(i want|i'?d like|i need|i'?m going|help me|i have to|i've got to|my goal)/.test(t)) return { type: "create_goal", text: transcript.trim() };

  return { type: "unknown", text: transcript };
}

/**
 * Microphone permission state machine. Platform providers map their own
 * statuses onto this, and the UI copies below never ask twice.
 */
export function nextPermissionState(current: PermissionState, result: { granted: boolean; canAskAgain: boolean; available?: boolean }): PermissionState {
  if (result.available === false) return "unavailable";
  if (result.granted) return "granted";
  if (!result.canAskAgain) return "blocked";
  if (current === "undetermined" || current === "unknown") return "denied";
  return "denied";
}

export const MICROPHONE_COPY: Record<PermissionState, { title: string; body: string; action?: string }> = {
  unknown: { title: "Speak your goal", body: "Sprint can listen so you can say what you want to achieve.", action: "Allow microphone" },
  undetermined: { title: "Speak your goal", body: "Sprint can listen so you can say what you want to achieve. You can always type instead.", action: "Allow microphone" },
  granted: { title: "Listening", body: "Say what you want to achieve." },
  denied: { title: "Microphone is off", body: "No problem. You can type instead, or allow the microphone when you're ready.", action: "Try again" },
  blocked: { title: "Microphone is blocked", body: "To use voice, allow the microphone for Sprint in your device settings. Typing works just as well.", action: "Open settings" },
  unavailable: { title: "Voice isn't available here", body: "This device or browser doesn't support speech recognition. Typing works just as well." },
};
