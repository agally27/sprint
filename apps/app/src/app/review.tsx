import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { formatMinutes, weeklyReview } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Title } from "@/components/Title";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/Button";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, space } from "@/theme/tokens";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Review() {
  const router = useRouter();
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const review = useMemo(() => weeklyReview(state, Date.now()), [state]);
  const max = Math.max(1, ...review.perDay);

  return (
    <Screen maxWidth={640} testID="review">
      <Title>Weekly review</Title>
      <View style={styles.top}>
        <Text variant="label" tone="muted">
          Weekly review
        </Text>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={20} />
        </Pressable>
      </View>
      <Text variant="display" style={{ marginTop: space.md }}>
        This week
      </Text>
      <Text tone="muted" style={{ marginTop: space.md }} testID="review-reflection">
        {review.reflection}
      </Text>

      <View style={styles.tiles}>
        <Tile value={String(review.sprintsCompleted)} label="Sprints" />
        <Tile value={formatMinutes(review.focusedMinutes)} label="Focused" />
        <Tile value={String(review.activeDays)} label="Active days" />
        <Tile value={String(review.milestonesCompleted)} label="Milestones" />
      </View>

      <SectionHeader title="Sprints by day" />
      <View style={[styles.chart, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.bars}>
          {review.perDay.map((n, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.bar, { height: Math.max(4, (n / max) * 64), backgroundColor: n > 0 ? colors.accent : colors.ringTrack }]} />
              <Text variant="caption" tone="faint" style={{ marginTop: 6 }}>
                {DAYS[i]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {review.missionsProgressed.length > 0 ? (
        <>
          <SectionHeader title="Missions progressed" />
          {review.missionsProgressed.map((m) => (
            <View key={m.id} style={[styles.row, { borderColor: colors.line }]}>
              <Ring size={40} progress={m.progress} complete={m.completed} stroke={4} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {m.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {m.completedSprints} sprint{m.completedSprints === 1 ? "" : "s"} · {Math.round(m.progress * 100)}%{m.completed ? " · complete" : ""}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {review.biggestAchievement ? (
        <>
          <SectionHeader title="Biggest achievement" />
          <View style={[styles.ach, { backgroundColor: colors.accentSoft }]}>
            <Icon name="sparkle" size={18} color={colors.accent} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text variant="bodyStrong">{review.biggestAchievement.title}</Text>
              <Text variant="small" tone="muted">
                {review.biggestAchievement.detail}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {review.nextPriority ? (
        <>
          <SectionHeader title="Next week's priority" />
          <View style={[styles.row, { borderColor: colors.line }]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{review.nextPriority.title}</Text>
              <Text variant="caption" tone="muted">
                Keep the next step small and start early in the week.
              </Text>
            </View>
            <Button label="Open" size="sm" variant="secondary" onPress={() => router.push({ pathname: "/mission/[id]", params: { id: review.nextPriority!.missionId } })} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { borderColor: colors.line }]}>
      <Text style={{ fontFamily: fonts.sansLight, fontSize: 28, lineHeight: 34, letterSpacing: -1 }}>{value}</Text>
      <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -12 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: space.xl },
  tile: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  chart: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: 1 },
  ach: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: radius.md },
});
