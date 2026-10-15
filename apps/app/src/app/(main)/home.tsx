import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { activeSession, formatClock, greeting, sessionTimer, sprintsCompletedOn, sprintsScheduledOn, timer, toDay, topCoachMessage, visibleMissions } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Title } from "@/components/Title";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Dial } from "@/components/Dial";
import { Chip } from "@/components/Chip";
import { NextSprintCard } from "@/components/NextSprintCard";
import { MissionRings } from "@/components/MissionRings";
import { MomentumMeter } from "@/components/MomentumMeter";
import { SectionHeader } from "@/components/SectionHeader";
import { Notice } from "@/components/Notice";
import { Wordmark } from "@/components/Wordmark";
import { HomeVoice } from "@/components/HomeVoice";
import { Ring } from "@/components/Ring";
import { useStore } from "@/store/store";
import { useNext } from "@/hooks/useNext";
import { useNow } from "@/hooks/useNow";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useTheme } from "@/theme/ThemeProvider";
import { categoryColor, radius, space } from "@/theme/tokens";
import { startSprint } from "@/lib/actions";

const QUICK_TIMES = [5, 15, 25, 45];

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const state = useStore((s) => s.state);
  const dispatch = useStore((s) => s.dispatch);
  const session = activeSession(state);
  const now = useNow(!!session, 1000);
  const next = useNext();
  const missions = useMemo(() => visibleMissions(state), [state]);
  const coachMsg = useMemo(() => topCoachMessage(state, Date.now()), [state]);
  const todayCount = sprintsCompletedOn(state, toDay(Date.now())).length;
  const adjustment = state.pendingAdjustments[0];
  const name = state.preferences.name;

  const reading = session ? timer.derive(sessionTimer(session), now) : undefined;
  const activeSprint = session ? state.sprints[session.sprintId] : undefined;

  const quick = useCallback((min: number) => router.push({ pathname: "/next", params: { minutes: String(min) } }), [router]);

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {isDesktop ? null : <Wordmark size={14} />}
        <Text variant="displayItalic" style={{ marginTop: isDesktop ? 0 : space.lg, fontSize: isDesktop ? 46 : 36, lineHeight: isDesktop ? 50 : 40 }} testID="greeting">
          {greeting(Date.now(), name)}.
        </Text>
        <Text tone="muted" style={{ marginTop: 6 }}>
          {todayCount === 0 ? "What are you moving forward today?" : todayCount === 1 ? "One sprint done today. Nice start." : `${todayCount} sprints done today.`}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {missions.length > 0 ? <HomeVoice /> : null}
        {isDesktop ? null : (
          <Pressable onPress={() => router.push("/settings")} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Settings" testID="open-settings">
            <Icon name="settings" size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );

  const today = toDay(Date.now());
  const featuredId = next.best?.sprint.id;
  const daily = (state.dailyMission?.day === today ? state.dailyMission.sprintIds : [])
    .map((id) => state.sprints[id])
    .filter((s): s is NonNullable<typeof s> => !!s && s.status === "planned" && s.id !== featuredId);
  const upcoming = sprintsScheduledOn(state, today)
    .filter((s) => !daily.some((d) => d.id === s.id) && s.id !== featuredId)
    .slice(0, 4);
  const dailyBlock =
    daily.length > 0 && !session ? (
      <View>
        <SectionHeader title="Also today" />
        <View style={[styles.daily, { backgroundColor: colors.surface, borderColor: colors.line }]} testID="daily-mission">
          {daily.map((s, i) => {
            const m = state.missions[s.missionId];
            return (
              <Pressable
                key={s.id}
                onPress={() => startSprint(s.id)}
                style={[styles.dailyRow, i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}
                scaleTo={0.995}
                accessibilityRole="button"
                accessibilityLabel={`Start ${s.title}`}
              >
                <Ring size={14} progress={1} color={m ? categoryColor[m.category] : colors.accent} stroke={3} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    Optional · {m?.title} · {s.durationMin} min
                  </Text>
                </View>
                <Icon name="play" size={14} color={colors.textFaint} />
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" tone="faint" style={{ marginTop: 8 }}>
          One important sprint, a couple of optional ones. Then stop. That's a good day.
        </Text>
      </View>
    ) : null;
  const upcomingBlock =
    isDesktop && upcoming.length > 0 ? (
      <View>
        <SectionHeader title="Also planned today" />
        {upcoming.map((s) => (
          <View key={s.id} style={[styles.upcomingRow, { borderTopColor: colors.line }]}>
            <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>
              {s.title}
            </Text>
            <Text variant="caption" tone="muted">
              {s.durationMin} min
            </Text>
          </View>
        ))}
      </View>
    ) : null;

  const mainColumn = (
    <View>
      {adjustment ? <Notice text={adjustment.message} onDismiss={() => dispatch({ type: "plan/dismissAdjustment", id: adjustment.id })} testID="adjustment-notice" /> : null}
      {coachMsg && coachMsg.kind !== "suggest" && coachMsg.kind !== "first_time" ? (
        <Notice text={coachMsg.text} icon={coachMsg.kind === "break" ? "pause-circle" : "sparkle"} testID="coach-line" />
      ) : null}

      {session && reading && activeSprint ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <SectionHeader title="Active sprint" />
          <Pressable
            onPress={() => router.push("/focus")}
            style={[styles.activeCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
            scaleTo={0.99}
            accessibilityRole="button"
            accessibilityLabel="Return to your sprint"
            testID="active-sprint-card"
          >
            <Dial size={150} progress={reading.progress} primary={formatClock(reading.remainingMs)} status={reading.status === "paused" ? "paused" : "running"} transitionMs={1000} />
            <View style={{ flex: 1, marginLeft: space.lg }}>
              <Text variant="label" tone="muted">
                {reading.status === "paused" ? "Paused" : "In progress"}
              </Text>
              <Text variant="heading" style={{ marginTop: 6 }} numberOfLines={2}>
                {activeSprint.title}
              </Text>
              <View style={{ marginTop: space.md, alignSelf: "flex-start" }}>
                <Button label={reading.status === "paused" ? "Resume" : "Return"} size="md" onPress={() => router.push("/focus")} />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : next.best ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <SectionHeader title="Next sprint" action="What next?" onAction={() => router.push("/next")} testID="open-next" />
          <NextSprintCard rec={next.best} onChange={() => router.push("/next")} />
          <View style={styles.quickRow}>
            <Text variant="small" tone="faint" style={{ marginRight: 4 }}>
              I have
            </Text>
            {QUICK_TIMES.map((m) => (
              <Chip key={m} label={`${m} min`} size="sm" onPress={() => quick(m)} testID={`quick-${m}`} />
            ))}
          </View>
        </Animated.View>
      ) : (
        <View style={[styles.empty, { borderColor: colors.line }]} testID="empty-next">
          <Text variant="heading" align="center">
            {missions.length === 0 ? "What's worth moving forward?" : next.empty === "all_done" ? "Everything planned is done." : "Ready for your next sprint?"}
          </Text>
          <Text tone="muted" align="center" style={{ marginTop: space.sm }}>
            {missions.length === 0
              ? "Start with one goal. Sprint turns it into something you can begin today."
              : next.empty === "all_done"
                ? "Add a sprint to a mission, or start a new goal."
                : "Resume a paused mission or add a new goal."}
          </Text>
          <View style={{ marginTop: space.xl }}>
            <Button
              label={missions.length === 0 ? "Add your first goal" : "Add a goal"}
              size="lg"
              onPress={() => router.push("/new")}
              icon={<Icon name="plus" size={18} color={colors.accentText} />}
              testID="empty-add-goal"
            />
          </View>
        </View>
      )}
    </View>
  );

  const sideColumn = (
    <View>
      <SectionHeader title="Your missions" action={missions.length > 0 ? "See all" : undefined} onAction={() => router.navigate("/missions")} />
      {missions.length > 0 ? (
        <MissionRings missions={missions} state={state} onAdd={() => router.push("/new")} />
      ) : (
        <Text tone="faint" variant="small">
          Start with one goal.
        </Text>
      )}
      <SectionHeader title="Momentum" action="Progress" onAction={() => router.navigate("/progress")} />
      <View style={[styles.momentum, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <MomentumMeter score={state.momentum.score} showLabel={false} />
        <Text variant="caption" tone="faint" style={{ marginTop: space.md }}>
          Momentum grows when you complete meaningful sprints and cools slowly. There is no streak to protect.
        </Text>
      </View>
    </View>
  );

  return (
    <Screen maxWidth={isDesktop ? 1120 : 680} testID="home">
      <Title>Today</Title>
      {header}
      {isDesktop ? (
        <View style={{ flexDirection: "row", gap: space.xxl, marginTop: space.lg }}>
          <View style={{ flex: 1.25 }}>
            {mainColumn}
            {dailyBlock}
            {upcomingBlock}
          </View>
          <View style={{ flex: 1 }}>{sideColumn}</View>
        </View>
      ) : (
        <>
          {mainColumn}
          {dailyBlock}
          {sideColumn}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10, marginTop: -4 },
  activeCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.xl, padding: space.lg },
  quickRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: space.lg },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: radius.xl, padding: space.xxl, alignItems: "center", marginTop: space.xxl },
  momentum: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  daily: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space.lg },
  dailyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, minHeight: 56 },
  upcomingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1 },
});
