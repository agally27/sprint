import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { activeSession, formatClock, missionProgress, sessionTimer, timer } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Dial } from "@/components/Dial";
import { Confirm } from "@/components/Sheet";
import { useStore } from "@/store/store";
import { useNow } from "@/hooks/useNow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useTheme } from "@/theme/ThemeProvider";
import { providers } from "@/store/providers";
import { haptics } from "@/platform/haptics";
import { space } from "@/theme/tokens";

const COUNT = ["3", "2", "1", "Go"];

function Countdown({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const { colors } = useTheme();
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const stepMs = reduced ? 320 : 760;
    opacity.value = 0;
    scale.value = 0.7;
    opacity.value = withSequence(withTiming(1, { duration: 140 }), withTiming(1, { duration: stepMs - 320 }), withTiming(0, { duration: 160 }));
    scale.value = withTiming(1, { duration: stepMs, easing: Easing.out(Easing.cubic) });
    haptics.trigger(i === COUNT.length - 1 ? "sprint_start" : "countdown_tick");
    providers.audio.play(i === COUNT.length - 1 ? "sprint_start" : "countdown_tick");
    const t = setTimeout(() => {
      if (i < COUNT.length - 1) setI(i + 1);
      else done.current();
    }, stepMs);
    return () => clearTimeout(t);
  }, [i, reduced, opacity, scale]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.countWrap} testID="countdown">
      <Animated.Text key={i} style={[styles.countText, { color: i === COUNT.length - 1 ? colors.accent : colors.text }, style]} accessibilityLiveRegion="assertive">
        {COUNT[i]}
      </Animated.Text>
    </View>
  );
}

export default function Focus() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop, width } = useBreakpoint();
  const params = useLocalSearchParams<{ sprintId?: string; minutes?: string }>();
  const state = useStore((s) => s.state);
  const dispatch = useStore((s) => s.dispatch);
  const session = activeSession(state);
  const pendingId = params.sprintId && !session && state.sprints[params.sprintId]?.status !== "completed" ? params.sprintId : undefined;
  const [counting, setCounting] = useState(() => !!pendingId);
  const [confirmStop, setConfirmStop] = useState(false);
  const now = useNow(!!session && !counting, 1000);

  const sprint = session ? state.sprints[session.sprintId] : pendingId ? state.sprints[pendingId] : undefined;
  const mission = sprint ? state.missions[sprint.missionId] : undefined;
  const reading = session ? timer.derive(sessionTimer(session), now) : undefined;
  const progress = mission ? missionProgress(state, mission.id) : undefined;

  // The timer starts when the countdown ends, not before.
  const finishCountdown = useCallback(() => {
    setCounting(false);
    if (!pendingId) return;
    const minutes = params.minutes ? Number(params.minutes) : undefined;
    const action: Parameters<typeof dispatch>[0] = { type: "sprint/start", sprintId: pendingId, now: Date.now() };
    if (minutes && Number.isFinite(minutes)) action.minutes = minutes;
    dispatch(action);
  }, [dispatch, pendingId, params.minutes]);

  // Leave when the session ends: completion screen if something was completed, otherwise home.
  useEffect(() => {
    if (session || counting) return;
    if (state.lastCompletion) router.replace("/complete");
    else router.dismissTo("/home");
  }, [session, counting, state.lastCompletion, router]);

  const complete = useCallback(() => {
    dispatch({ type: "sprint/complete", now: Date.now() });
  }, [dispatch]);

  const toggle = useCallback(() => {
    if (!reading) return;
    haptics.trigger("selection");
    dispatch({ type: reading.status === "paused" ? "sprint/resume" : "sprint/pause", now: Date.now() });
  }, [reading, dispatch]);

  const stop = useCallback(() => {
    setConfirmStop(false);
    dispatch({ type: "sprint/cancel", now: Date.now() });
  }, [dispatch]);

  if (!sprint) return <Screen scroll={false}>{null}</Screen>;

  const paused = reading?.status === "paused";
  const almost = reading?.status === "running" && reading.remainingMs <= 60_000;
  const dialSize = Math.min(isDesktop ? 420 : width - 72, 420);
  const position = progress ? `Sprint ${Math.min(progress.completed + 1, progress.total)}/${progress.total}` : undefined;

  return (
    <Screen scroll={false} maxWidth={720} testID="focus" contentStyle={{ paddingTop: space.lg }}>
      <View style={styles.top}>
        <Pressable onPress={() => setConfirmStop(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Stop this sprint" testID="focus-close">
          <Icon name="close" size={22} color={colors.textMuted} />
        </Pressable>
        <Text variant="label" tone="muted" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
          {mission?.title}
        </Text>
        <Pressable onPress={() => dispatch({ type: "sprint/extend", now: Date.now(), deltaMin: 5 })} style={[styles.iconBtn, { width: 64 }]} accessibilityRole="button" accessibilityLabel="Add five minutes" testID="focus-extend">
          <Text variant="smallStrong" tone="muted">
            +5
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {counting || !reading ? (
          <View style={{ alignItems: "center" }}>
            <Countdown onDone={finishCountdown} />
            <Text variant="heading" align="center" style={{ maxWidth: 420 }} numberOfLines={2}>
              {sprint.title}
            </Text>
            <Text variant="small" tone="muted" align="center" style={{ marginTop: 6 }}>
              {Number(params.minutes) || sprint.durationMin} minutes
            </Text>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(150)} style={{ alignItems: "center" }}>
            <Dial
              size={dialSize}
              progress={reading.progress}
              primary={formatClock(reading.remainingMs)}
              label={paused ? "Paused" : almost ? "Almost there" : "Remaining"}
              sublabel={position}
              status={paused ? "paused" : "running"}
              testID="focus-dial"
            />
            <Text variant="heading" align="center" style={{ marginTop: space.xl, maxWidth: 420 }} numberOfLines={2} testID="focus-title">
              {sprint.title}
            </Text>
            {sprint.detail ? (
              <Text variant="small" tone="muted" align="center" style={{ marginTop: 6, maxWidth: 360 }}>
                {sprint.detail}
              </Text>
            ) : null}
          </Animated.View>
        )}
      </View>

      {!counting && reading ? (
        <View style={styles.controls}>
          <Button label={paused ? "Resume" : "Pause"} variant="secondary" size="lg" onPress={toggle} icon={<Icon name={paused ? "play" : "pause"} size={16} />} testID="focus-toggle" style={{ minWidth: 140 }} />
          <View style={{ width: 12 }} />
          <Button label="Complete" variant={almost ? "success" : "primary"} size="lg" onPress={complete} icon={<Icon name="check" size={18} color={almost ? "#06281A" : colors.accentText} />} testID="focus-complete" style={{ minWidth: 160 }} />
        </View>
      ) : null}

      <Confirm
        visible={confirmStop}
        title="Stop this sprint?"
        body="Your progress is safe. The sprint goes back into your plan, ready for another time."
        confirmLabel="Stop"
        cancelLabel="Keep going"
        destructive
        onConfirm={stop}
        onCancel={() => setConfirmStop(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xl },
  controls: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingBottom: space.lg },
  countWrap: { height: 300, alignItems: "center", justifyContent: "center" },
  countText: { fontFamily: "Manrope_200ExtraLight", fontSize: 148, lineHeight: 160, letterSpacing: -4 },
});
