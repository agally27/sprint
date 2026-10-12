import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { activeSession, parseVoiceCommand, recommendNext, sprintsCompletedOn, toDay } from "@sprint/core";
import { Text } from "./Text";
import { VoiceButton } from "./VoiceButton";
import { useVoice } from "@/hooks/useVoice";
import { useStore } from "@/store/store";
import { startSprint } from "@/lib/actions";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

/**
 * Voice on the home screen: "Start my next sprint", "What's next?",
 * "I have 20 minutes", "Give me a 15-minute sprint", or a whole new goal.
 */
export function HomeVoice() {
  const router = useRouter();
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const dispatch = useStore((s) => s.dispatch);
  const [reply, setReply] = useState<string | undefined>();

  const say = useCallback((text: string) => {
    setReply(text);
    setTimeout(() => setReply(undefined), 4000);
  }, []);

  const handle = useCallback(
    (transcript: string) => {
      const intent = parseVoiceCommand(transcript);
      const now = Date.now();
      switch (intent.type) {
        case "start_next": {
          const r = recommendNext(state, { now });
          if (r.best) startSprint(r.best.sprint.id);
          else say("Nothing is planned yet. Add a goal first.");
          return;
        }
        case "whats_next":
          router.push("/next");
          return;
        case "available_time":
          router.push({ pathname: "/next", params: { minutes: String(intent.minutes) } });
          return;
        case "sprint_for": {
          const r = recommendNext(state, { now, availableMin: intent.minutes });
          if (r.best) startSprint(r.best.sprint.id, r.best.suggestedMinutes ?? (r.best.sprint.durationMin > intent.minutes ? intent.minutes : undefined));
          else router.push({ pathname: "/next", params: { minutes: String(intent.minutes) } });
          return;
        }
        case "create_goal":
          router.push({ pathname: "/new", params: { text: intent.text } });
          return;
        case "pause":
        case "resume":
          if (activeSession(state)) {
            dispatch({ type: intent.type === "pause" ? "sprint/pause" : "sprint/resume", now });
            router.push("/focus");
          } else say("There's no sprint running right now.");
          return;
        case "how_am_i_doing": {
          const today = sprintsCompletedOn(state, toDay(now)).length;
          say(today === 0 ? `Momentum is at ${Math.round(state.momentum.score)}. One short sprint would get today moving.` : `${today} sprint${today === 1 ? "" : "s"} today. Momentum is at ${Math.round(state.momentum.score)}.`);
          return;
        }
        case "priority": {
          const r = recommendNext(state, { now });
          say(r.best ? `${r.best.mission.title}: ${r.best.sprint.title}.` : "Add a goal and I'll tell you.");
          return;
        }
        case "move_to_tomorrow": {
          const r = recommendNext(state, { now });
          if (r.best) {
            dispatch({ type: "sprint/reschedule", sprintId: r.best.sprint.id, day: toDay(now + 86_400_000), now });
            say(`Moved "${r.best.sprint.title}" to tomorrow.`);
          }
          return;
        }
        case "take_break":
          say("Good call. Your plan will be here when you're back.");
          return;
        default:
          say(`I heard "${transcript}". Try "start my next sprint" or "I have 20 minutes".`);
      }
    },
    [state, dispatch, router, say],
  );

  const voice = useVoice(handle);
  if (!voice.enabled || voice.permission === "unavailable") return null;

  return (
    <View style={styles.wrap}>
      {reply || voice.partial ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={[styles.bubble, { backgroundColor: colors.surfaceStrong }]}>
          <Text variant="small" numberOfLines={3}>
            {voice.partial || reply}
          </Text>
        </Animated.View>
      ) : null}
      <VoiceButton voice={voice} size={48} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, maxWidth: 260 },
});
