import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { ACHIEVEMENT_COPY, formatMinutes, missionProgress } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Dial } from "@/components/Dial";
import { Ring } from "@/components/Ring";
import { NextSprintCard } from "@/components/NextSprintCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Chip } from "@/components/Chip";
import { useStore } from "@/store/store";
import { useNext } from "@/hooks/useNext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useTheme } from "@/theme/ThemeProvider";
import { providers } from "@/store/providers";
import { haptics } from "@/platform/haptics";
import { categoryColor, fonts, radius, space } from "@/theme/tokens";

export default function Complete() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop, width } = useBreakpoint();
  const state = useStore((s) => s.state);
  const dispatch = useStore((s) => s.dispatch);
  const summary = state.lastCompletion;
  const sprint = summary ? state.sprints[summary.sprintId] : undefined;
  const mission = summary ? state.missions[summary.missionId] : undefined;
  const [followUp, setFollowUp] = useState<number | undefined>();
  const [reflection, setReflection] = useState("");
  const [reflected, setReflected] = useState(false);
  const [notifAsked, setNotifAsked] = useState(false);
  const askNotifications = state.preferences.notifications.enabled && (state.permissions.notifications === "unknown" || state.permissions.notifications === "undetermined") && !notifAsked;
  const requestNotifications = useCallback(async () => {
    setNotifAsked(true);
    const r = await providers.notifications.requestPermission();
    dispatch({ type: "permissions/set", key: "notifications", state: r });
  }, [dispatch]);
  const celebrated = useRef(false);
  const leaving = useRef(false);
  const hadSummary = useRef(!!summary);

  const next = useNext({ exclude: summary ? [summary.sprintId] : [], preferMissionId: summary?.missionId });
  const progress = useMemo(() => (mission ? missionProgress(state, mission.id) : undefined), [state, mission]);

  useEffect(() => {
    if (!summary || celebrated.current) return;
    celebrated.current = true;
    const kind = summary.missionCompleted ? "mission_complete" : summary.milestoneCompleted ? "milestone_complete" : "sprint_complete";
    haptics.trigger(kind);
    providers.audio.play(kind);
    if (summary.achievements.length > 0) setTimeout(() => haptics.trigger("reward_unlocked"), 900);
  }, [summary]);

  // Opened without anything to show (e.g. a stale deep link): go home. If the
  // summary disappears later it's because the next sprint started on top of us.
  useEffect(() => {
    if (!summary && !leaving.current && !hadSummary.current) router.dismissTo("/home");
  }, [summary, router]);

  const leave = useCallback(
    (to: "/home" | "/missions") => {
      leaving.current = true;
      dispatch({ type: "completion/clear" });
      router.dismissTo(to);
    },
    [dispatch, router],
  );

  const addFollowUp = useCallback(
    (minutes: number) => {
      if (!summary) return;
      dispatch({ type: "sprint/followUp", sprintId: summary.sprintId, minutes, now: Date.now() });
      setFollowUp(minutes);
    },
    [summary, dispatch],
  );

  const saveReflection = useCallback(() => {
    if (!summary || !reflection.trim()) return;
    dispatch({ type: "mission/reflect", missionId: summary.missionId, reflection: { helped: reflection.trim() }, now: Date.now() });
    setReflected(true);
  }, [summary, reflection, dispatch]);

  if (!summary || !sprint || !mission || !progress) return <Screen scroll={false}>{null}</Screen>;

  const dialSize = Math.min(isDesktop ? 260 : width * 0.56, 260);
  const tint = categoryColor[mission.category] ?? colors.accent;
  const headline = summary.missionCompleted ? "Mission complete" : summary.milestoneCompleted ? "Milestone complete" : "Sprint complete";

  return (
    <Screen maxWidth={640} testID="complete">
      <View style={{ alignItems: "center", paddingTop: isDesktop ? space.xl : space.sm }}>
        <Animated.View entering={FadeIn.duration(500)}>
          <Dial size={dialSize} progress={1} status="complete" transitionMs={900}>
            <Animated.View entering={FadeIn.delay(650).duration(400)}>
              <Icon name="check" size={dialSize * 0.26} color={colors.success} strokeWidth={2.2} />
            </Animated.View>
          </Dial>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(500).duration(450)} style={{ alignItems: "center" }}>
          <Text variant="label" tone="success" style={{ marginTop: space.xl }} testID="complete-headline">
            {summary.expired ? `Time's up · ${headline}` : headline}
          </Text>
          <Text variant="display" align="center" style={{ marginTop: space.sm, maxWidth: 420 }}>
            {summary.missionCompleted ? `${mission.title}. Done.` : summary.line}
          </Text>
          <Text tone="muted" align="center" style={{ marginTop: space.sm, maxWidth: 420 }} numberOfLines={2}>
            {sprint.title}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(800).duration(450)}>
        <View style={[styles.stats, { borderColor: colors.line }]}>
          <Stat label="Sprint" value="+1" />
          <Divider />
          <Stat label="Momentum" value={`+${summary.momentumGain}`} accent />
          <Divider />
          <Stat label="Focused" value={formatMinutes(summary.focusedMinutes)} />
        </View>

        <View style={[styles.missionRow, { backgroundColor: colors.surface, borderColor: colors.line }]} testID="mission-progress">
          <Ring size={56} progress={progress.ratio} color={tint} complete={summary.missionCompleted} stroke={5}>
            <Text variant="caption">{Math.round(progress.ratio * 100)}%</Text>
          </Ring>
          <View style={{ flex: 1, marginLeft: space.lg }}>
            <Text variant="label" tone="muted">
              Mission progress
            </Text>
            <Text variant="subheading" style={{ marginTop: 4 }} numberOfLines={1}>
              {mission.title}
            </Text>
            <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
              {progress.completed} of {progress.total} sprints
              {summary.milestoneCompleted ? ` · ${summary.milestoneCompleted.title} finished` : ""}
            </Text>
          </View>
        </View>

        {summary.achievements.length > 0 ? (
          <View style={{ marginTop: space.lg }} testID="achievements-unlocked">
            {summary.achievements.map((key) => (
              <View key={key} style={[styles.achievement, { backgroundColor: colors.accentSoft }]}>
                <Icon name="sparkle" size={16} color={colors.accent} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text variant="smallStrong">{ACHIEVEMENT_COPY[key].title}</Text>
                  <Text variant="caption" tone="muted">
                    {ACHIEVEMENT_COPY[key].detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {summary.expired && !followUp ? (
          <View style={{ marginTop: space.lg }}>
            <Text variant="small" tone="muted">
              Not quite finished? Add a short follow-up to the plan. The time you spent still counts.
            </Text>
            <View style={styles.chips}>
              {[10, 15, 25].map((m) => (
                <Chip key={m} label={`+${m} min`} size="sm" onPress={() => addFollowUp(m)} testID={`follow-up-${m}`} />
              ))}
            </View>
          </View>
        ) : followUp ? (
          <Text variant="small" tone="muted" style={{ marginTop: space.lg }} testID="follow-up-added">
            Added a {followUp}-minute follow-up to {mission.title}.
          </Text>
        ) : null}

        {summary.missionCompleted && !reflected ? (
          <View style={[styles.reflect, { borderColor: colors.line }]}>
            <Text variant="subheading">What helped?</Text>
            <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
              One line is plenty. Sprint uses it to shape your next plan.
            </Text>
            <TextInput value={reflection} onChangeText={setReflection} placeholder="Short mornings, before email." placeholderTextColor={colors.textFaint} style={[styles.input, { color: colors.text, borderColor: colors.line }]} accessibilityLabel="What helped" />
            <View style={{ flexDirection: "row", marginTop: space.md }}>
              <Button label="Save" size="sm" onPress={saveReflection} disabled={!reflection.trim()} />
            </View>
          </View>
        ) : null}

        {askNotifications ? (
          <View style={[styles.nudge, { borderColor: colors.line }]} testID="notification-nudge">
            <View style={{ flex: 1, marginRight: space.md }}>
              <Text variant="smallStrong">Want a quiet nudge when a sprint ends?</Text>
              <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Only sprint endings and one morning suggestion. You control all of it in settings.
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              <Button label="Allow" size="sm" onPress={requestNotifications} testID="nudge-allow" />
              <Button label="Not now" size="sm" variant="ghost" onPress={() => { setNotifAsked(true); dispatch({ type: "permissions/set", key: "notifications", state: "denied" }); }} testID="nudge-skip" />
            </View>
          </View>
        ) : null}

        <SectionHeader title="What next?" />
        {next.best ? (
          <NextSprintCard rec={next.best} prominent={false} testID="complete-next" />
        ) : (
          <View style={[styles.empty, { borderColor: colors.line }]}>
            <Text align="center">{next.empty === "all_done" ? "That was the last planned sprint." : "Nothing else is planned right now."}</Text>
            <Text tone="muted" variant="small" align="center" style={{ marginTop: 4 }}>
              Add a goal when you're ready for the next thing.
            </Text>
          </View>
        )}
        <View style={styles.rowActions}>
          <Pressable onPress={() => leave("/home")} style={styles.textBtn} accessibilityRole="button" testID="take-break">
            <Text variant="bodyStrong" tone="muted">
              Take a break
            </Text>
          </Pressable>
          <Pressable onPress={() => leave("/home")} style={styles.textBtn} accessibilityRole="button" testID="finish-today">
            <Text variant="bodyStrong" tone="muted">
              Finish for today
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontFamily: fonts.sansLight, fontSize: 30, lineHeight: 36, letterSpacing: -1 }} tone={accent ? "accent" : "default"}>
        {value}
      </Text>
      <Text variant="label" tone="faint" style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ width: 1, height: 36, backgroundColor: colors.line }} />;
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", alignItems: "center", marginTop: space.xxl, paddingVertical: space.lg, borderTopWidth: 1, borderBottomWidth: 1 },
  missionRow: { flexDirection: "row", alignItems: "center", marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  achievement: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: radius.md, marginBottom: 8 },
  chips: { flexDirection: "row", gap: 8, marginTop: space.md, flexWrap: "wrap" },
  reflect: { marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  input: { marginTop: space.md, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: fonts.sans, fontSize: 16 },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: radius.lg, padding: space.xl },
  nudge: { flexDirection: "row", alignItems: "center", marginTop: space.xl, padding: space.lg, borderWidth: 1, borderRadius: radius.lg },
  rowActions: { flexDirection: "row", justifyContent: "center", gap: space.xxl, marginTop: space.xl },
  textBtn: { minHeight: 44, justifyContent: "center" },
});
