import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { SPRINT_DURATIONS } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { NextSprintCard } from "@/components/NextSprintCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Ring } from "@/components/Ring";
import { useNext } from "@/hooks/useNext";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { startSprint } from "@/lib/actions";
import { categoryColor, radius, space } from "@/theme/tokens";

export default function Next() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const params = useLocalSearchParams<{ minutes?: string }>();
  const initial = params.minutes ? Number(params.minutes) : undefined;
  const [minutes, setMinutes] = useState<number | undefined>(initial && Number.isFinite(initial) ? initial : undefined);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const opts = useMemo(() => (minutes !== undefined ? { availableMin: minutes } : {}), [minutes]);
  const result = useNext(opts);

  return (
    <Screen maxWidth={640} testID="next">
      <View style={styles.top}>
        <Text variant="label" tone="muted">
          What next?
        </Text>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Close" testID="next-close">
          <Icon name="close" size={20} />
        </Pressable>
      </View>
      <Text variant="display" style={{ marginTop: space.md, fontSize: isDesktop ? 44 : 36, lineHeight: isDesktop ? 48 : 40 }}>
        How much time do you have?
      </Text>
      <View style={styles.chips}>
        <Chip label="Any" selected={minutes === undefined} onPress={() => setMinutes(undefined)} testID="time-any" />
        {SPRINT_DURATIONS.map((m) => (
          <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} testID={`time-${m}`} />
        ))}
      </View>

      <SectionHeader title="Your next sprint" />
      {result.best ? (
        <Animated.View key={result.best.sprint.id + String(minutes)} entering={FadeIn.duration(250)}>
          <NextSprintCard rec={result.best} testID="next-best" />
        </Animated.View>
      ) : (
        <View style={[styles.empty, { borderColor: colors.line }]} testID="next-empty">
          <Text variant="heading" align="center">
            {result.empty === "no_missions" ? "Start with one goal." : result.empty === "all_done" ? "Everything planned is done." : "Nothing fits in that time."}
          </Text>
          <Text tone="muted" align="center" style={{ marginTop: space.sm }}>
            {result.empty === "no_missions" ? "Sprint will turn it into something you can begin today." : result.empty === "all_done" ? "Add a sprint to a mission, or start a new goal." : "Try a few more minutes, or run part of a longer sprint."}
          </Text>
          <View style={{ marginTop: space.lg }}>
            <Button label={result.empty === "nothing_fits" ? "Show any length" : "Add a goal"} onPress={() => (result.empty === "nothing_fits" ? setMinutes(undefined) : router.push("/new"))} />
          </View>
        </View>
      )}

      {result.alternatives.length > 0 ? (
        <>
          <SectionHeader title="Alternatives" action={showAlternatives ? "Hide" : "Show"} onAction={() => setShowAlternatives((v) => !v)} testID="toggle-alternatives" />
          {showAlternatives
            ? result.alternatives.map((a) => (
                <View key={a.sprint.id} style={[styles.alt, { borderColor: colors.line, backgroundColor: colors.surface }]} testID="alternative">
                  <Ring size={12} progress={1} color={categoryColor[a.mission.category]} stroke={3} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {a.sprint.title}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {a.mission.title} · {a.suggestedMinutes ?? a.sprint.durationMin} min
                    </Text>
                  </View>
                  <Button label="Start" size="sm" variant="secondary" onPress={() => startSprint(a.sprint.id, a.suggestedMinutes)} />
                </View>
              ))
            : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.xl },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: radius.xl, padding: space.xl, alignItems: "center" },
  alt: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, borderRadius: radius.lg, marginBottom: 8 },
});
