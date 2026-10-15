import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ACHIEVEMENT_COPY, BAND_LABELS, band, formatMinutes, levelFor, stats, weeklyReview, type AchievementKey } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Title } from "@/components/Title";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { SectionHeader } from "@/components/SectionHeader";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { categoryColor, fonts, radius, space } from "@/theme/tokens";

const ALL_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_COPY) as AchievementKey[];

export default function Progress() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const state = useStore((s) => s.state);
  const now = Date.now();
  const st = useMemo(() => stats(state, now), [state, now]);
  const review = useMemo(() => weeklyReview(state, now), [state, now]);
  const level = levelFor(state.momentum.focusMinutes);
  const completedMissions = Object.values(state.missions).filter((m) => m.status === "completed");
  const unlocked = new Set(state.achievements.map((a) => a.key));
  const maxDay = Math.max(1, ...st.last28Days.map((d) => d.minutes));
  const empty = st.sprintsCompleted === 0;

  return (
    <Screen maxWidth={isDesktop ? 920 : 680} testID="progress">
      <Title>Progress</Title>
      <Text variant="label" tone="muted">
        Progress
      </Text>
      <Text variant="display" style={{ marginTop: space.sm }}>
        What you've moved forward
      </Text>

      <View style={[styles.momentumCard, { backgroundColor: colors.surface, borderColor: colors.line }, isDesktop ? { flexDirection: "row", alignItems: "center" } : null]}>
        <View style={{ alignItems: "center" }}>
          <Ring size={168} progress={state.momentum.score / 100} stroke={10}>
            <Text style={{ fontFamily: fonts.sansExtralight, fontSize: 52, lineHeight: 58, letterSpacing: -2 }} testID="momentum-score">
              {Math.round(state.momentum.score)}
            </Text>
            <Text variant="label" tone="muted">
              {BAND_LABELS[band(state.momentum.score)]}
            </Text>
          </Ring>
        </View>
        <View style={[{ flex: 1 }, isDesktop ? { marginLeft: space.xxl } : { marginTop: space.xl }]}>
          <Text variant="label" tone="muted">
            Momentum
          </Text>
          <Text variant="small" style={{ marginTop: 6 }}>
            How much progress you're carrying forward right now. It grows with meaningful sprints and cools slowly. It never resets.
          </Text>
          <View style={[styles.levelRow, { borderTopColor: colors.line }]}>
            <View style={{ flex: 1 }}>
              <Text variant="label" tone="muted">
                Level {level.level} · {level.name}
              </Text>
              <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
                <View style={[styles.fill, { width: `${Math.max(2, level.progress * 100)}%`, backgroundColor: colors.accent }]} />
              </View>
              <Text variant="caption" tone="faint" style={{ marginTop: 6 }}>
                {level.span !== undefined ? `${formatMinutes(level.span - level.into)} of focus to the next level` : "Top level"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tiles}>
        <Tile value={String(st.sprintsCompleted)} label="Sprints" />
        <Tile value={formatMinutes(st.focusedMinutes)} label="Focused" />
        <Tile value={String(st.activeDaysLast30)} label="Active days · 30d" />
        <Tile value={String(st.missionsCompleted)} label="Missions done" />
      </View>

      <SectionHeader title="Last four weeks" />
      <View
        style={[styles.chart, { backgroundColor: colors.surface, borderColor: colors.line }]}
        accessibilityRole="image"
        accessibilityLabel={`Focused minutes over the last 28 days, ${st.focusedMinutes} in total`}
      >
        {empty ? (
          <Text tone="faint" variant="small" align="center" style={{ paddingVertical: space.xl }}>
            Your progress will appear here.
          </Text>
        ) : (
          <View style={styles.bars}>
            {st.last28Days.map((d) => (
              <View key={d.day} style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(3, (d.minutes / maxDay) * 72),
                      backgroundColor: d.minutes > 0 ? colors.accent : colors.ringTrack,
                      opacity: d.minutes > 0 ? 0.55 + 0.45 * (d.minutes / maxDay) : 1,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      <SectionHeader title="This week" action="Weekly review" onAction={() => router.push("/review")} testID="open-review" />
      <Pressable onPress={() => router.push("/review")} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.line }]} scaleTo={0.99} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">
            {review.sprintsCompleted} sprint{review.sprintsCompleted === 1 ? "" : "s"} · {formatMinutes(review.focusedMinutes)} · {review.activeDays} active day{review.activeDays === 1 ? "" : "s"}
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }} numberOfLines={2}>
            {review.reflection}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.textFaint} />
      </Pressable>

      {st.minutesByMission.length > 0 ? (
        <>
          <SectionHeader title="Time by mission" />
          {st.minutesByMission.slice(0, 6).map((m) => (
            <View key={m.missionId} style={styles.missionTime}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>
                  {m.title}
                </Text>
                <Text variant="small" tone="muted">
                  {formatMinutes(m.minutes)}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.ringTrack, marginTop: 0 }]}>
                <View style={[styles.fill, { width: `${Math.max(2, (m.minutes / Math.max(1, st.focusedMinutes)) * 100)}%`, backgroundColor: categoryColor[m.category] ?? colors.accent }]} />
              </View>
            </View>
          ))}
        </>
      ) : null}

      <SectionHeader title="Moved forward" />
      {completedMissions.length === 0 ? (
        <Text variant="small" tone="faint">
          Completed missions become rings here.
        </Text>
      ) : (
        <View style={styles.constellation}>
          {completedMissions.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push({ pathname: "/mission/[id]", params: { id: m.id } })}
              style={{ alignItems: "center", width: 96 }}
              accessibilityRole="button"
              accessibilityLabel={`${m.title}, complete`}
            >
              <Ring size={64} progress={1} complete stroke={5}>
                <Icon name="check" size={20} color={colors.success} />
              </Ring>
              <Text variant="caption" align="center" numberOfLines={2} style={{ marginTop: 8 }}>
                {m.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader title="Achievements" />
      <View style={styles.grid}>
        {ALL_ACHIEVEMENTS.map((key) => {
          const has = unlocked.has(key);
          return (
            <View
              key={key}
              style={[
                styles.ach,
                { backgroundColor: has ? colors.surface : "transparent", borderColor: has ? colors.line : colors.line, opacity: has ? 1 : 0.5 },
                isDesktop ? { width: "31.5%" } : null,
              ]}
              accessibilityLabel={`${ACHIEVEMENT_COPY[key].title}${has ? ", unlocked" : ", locked"}`}
            >
              <Icon name={has ? "sparkle" : "ring"} size={16} color={has ? colors.accent : colors.textFaint} />
              <Text variant="smallStrong" style={{ marginTop: 8 }}>
                {ACHIEVEMENT_COPY[key].title}
              </Text>
              <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {ACHIEVEMENT_COPY[key].detail}
              </Text>
            </View>
          );
        })}
      </View>
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
  momentumCard: { marginTop: space.xl, padding: space.xl, borderWidth: 1, borderRadius: radius.xl },
  levelRow: { flexDirection: "row", marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  fill: { height: 6, borderRadius: 3 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: space.lg },
  tile: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  chart: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 3 },
  barWrap: { flex: 1, alignItems: "stretch", justifyContent: "flex-end" },
  bar: { borderRadius: 3 },
  reviewCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  missionTime: { marginBottom: 12 },
  constellation: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  ach: { width: "48%", flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: 14 },
});
