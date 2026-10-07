import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { formatDeadline, formatMinutes, missionHealth, missionProgress, nextSprintFor, visibleMissions, type Mission } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Title } from "@/components/Title";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { SectionHeader } from "@/components/SectionHeader";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { categoryColor, radius, space } from "@/theme/tokens";

const HEALTH_COPY: Record<string, string> = {
  ahead: "Ahead of plan",
  on_track: "On track",
  at_risk: "Tight on time",
  open: "No deadline",
  completed: "Complete",
};

function MissionRow({ mission }: { mission: Mission }) {
  const router = useRouter();
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const p = missionProgress(state, mission.id);
  const next = nextSprintFor(state, mission.id);
  const health = missionHealth(state, mission, Date.now());
  const paused = mission.status === "paused";
  const done = mission.status === "completed";
  const tint = paused ? colors.textFaint : categoryColor[mission.category];
  return (
    <Pressable onPress={() => router.push({ pathname: "/mission/[id]", params: { id: mission.id } })} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={mission.title} testID={`mission-row-${mission.id}`}>
      <Ring size={60} progress={p.ratio} color={tint} complete={done} stroke={5}>
        {done ? <Icon name="check" size={20} color={colors.success} /> : <Text variant="caption">{Math.round(p.ratio * 100)}%</Text>}
      </Ring>
      <View style={{ flex: 1, marginLeft: space.lg }}>
        <Text variant="subheading" numberOfLines={1} tone={paused ? "muted" : "default"}>
          {mission.title}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: 3 }} numberOfLines={1}>
          {paused ? "Paused" : HEALTH_COPY[health]}
          {mission.deadline !== undefined && !done ? ` · ${formatDeadline(mission.deadline, Date.now())}` : ""}
          {!done ? ` · ${formatMinutes(p.remainingMinutes)} left` : ""}
        </Text>
        {next && !paused && !done ? (
          <Text variant="small" style={{ marginTop: 6 }} numberOfLines={1}>
            Next: {next.title}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

export default function Missions() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const state = useStore((s) => s.state);
  const missions = useMemo(() => visibleMissions(state), [state]);
  const active = missions.filter((m) => m.status !== "completed");
  const completed = missions.filter((m) => m.status === "completed");

  return (
    <Screen maxWidth={isDesktop ? 820 : 680} testID="missions">
      <Title>Missions</Title>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            Missions
          </Text>
          <Text variant="display" style={{ marginTop: space.sm }}>
            What you're moving forward
          </Text>
        </View>
      </View>
      <View style={{ marginTop: space.xl }}>
        <Button label="New goal" onPress={() => router.push("/new")} icon={<Icon name="plus" size={18} color={colors.accentText} />} testID="missions-add" />
      </View>

      {active.length === 0 && completed.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.line }]} testID="missions-empty">
          <Text variant="heading" align="center">
            Start with one goal.
          </Text>
          <Text tone="muted" align="center" style={{ marginTop: space.sm }}>
            Sprint will turn it into milestones and short sprints you can begin today.
          </Text>
        </View>
      ) : null}

      {active.length > 0 ? (
        <>
          <SectionHeader title="Active" />
          {active.map((m) => (
            <MissionRow key={m.id} mission={m} />
          ))}
        </>
      ) : null}
      {completed.length > 0 ? (
        <>
          <SectionHeader title="Moved forward" />
          {completed.map((m) => (
            <MissionRow key={m.id} mission={m} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", padding: space.lg, borderWidth: 1, borderRadius: radius.lg, marginBottom: 10 },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: radius.xl, padding: space.xxl, alignItems: "center", marginTop: space.xxl },
});
