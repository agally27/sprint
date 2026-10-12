import React from "react";
import { StyleSheet, View } from "react-native";
import type { Recommendation } from "@sprint/core";
import { Text } from "./Text";
import { Button } from "./Button";
import { Pressable } from "./Pressable";
import { Icon } from "./Icon";
import { Ring } from "./Ring";
import { useTheme } from "@/theme/ThemeProvider";
import { categoryColor, radius, space } from "@/theme/tokens";
import { startSprint } from "@/lib/actions";

export function NextSprintCard({ rec, onChange, minutesOverride, prominent = true, testID = "next-sprint" }: { rec: Recommendation; onChange?: () => void; minutesOverride?: number; prominent?: boolean; testID?: string }) {
  const { colors } = useTheme();
  const minutes = minutesOverride ?? rec.suggestedMinutes ?? rec.sprint.durationMin;
  const partial = minutes < rec.sprint.durationMin;
  const tint = categoryColor[rec.mission.category] ?? colors.accent;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]} testID={testID}>
      <View style={styles.head}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Ring size={14} progress={1} color={tint} stroke={3} />
          <Text variant="label" tone="muted" style={{ marginLeft: 8 }} numberOfLines={1}>
            {rec.mission.title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Icon name="clock" size={14} color={colors.textFaint} />
          <Text variant="smallStrong" tone="muted" style={{ marginLeft: 5 }} testID="next-minutes">
            {minutes} min{partial ? ` of ${rec.sprint.durationMin}` : ""}
          </Text>
        </View>
      </View>
      <Text variant={prominent ? "title" : "heading"} style={{ marginTop: space.md }} testID="next-title">
        {rec.sprint.title}
      </Text>
      {rec.sprint.detail ? (
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          {rec.sprint.detail}
        </Text>
      ) : null}
      <Text variant="small" tone="muted" style={{ marginTop: space.md }}>
        {rec.reason}
      </Text>
      <View style={styles.actions}>
        <Button label="Start sprint" size={prominent ? "xl" : "lg"} onPress={() => startSprint(rec.sprint.id, partial ? minutes : undefined)} icon={<Icon name="play" size={16} color={colors.accentText} />} style={{ flex: 1 }} testID="start-sprint" />
        {onChange ? (
          <Pressable onPress={onChange} style={[styles.change, { borderColor: colors.lineStrong }]} accessibilityRole="button" accessibilityLabel="Choose a different sprint" testID="change-sprint">
            <Icon name="more" size={20} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, padding: space.xl },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actions: { flexDirection: "row", alignItems: "center", marginTop: space.xl, gap: 10 },
  change: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
