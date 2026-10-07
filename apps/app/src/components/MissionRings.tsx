import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { missionProgress, type AppState, type Mission } from "@sprint/core";
import { Ring } from "./Ring";
import { Text } from "./Text";
import { Pressable } from "./Pressable";
import { Icon } from "./Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { categoryColor, space } from "@/theme/tokens";

/** Missions as a row of rings: what matters, what's active, what's done. */
export function MissionRings({ missions, state, onAdd }: { missions: Mission[]; state: AppState; onAdd?: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ marginHorizontal: -space.xl }} testID="mission-rings">
      {missions.map((m) => {
        const p = missionProgress(state, m.id);
        const done = m.status === "completed";
        const paused = m.status === "paused";
        return (
          <Pressable key={m.id} onPress={() => router.push({ pathname: "/mission/[id]", params: { id: m.id } })} style={styles.item} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={`${m.title}, ${Math.round(p.ratio * 100)} percent`} testID={`mission-ring-${m.id}`}>
            <Ring size={76} progress={p.ratio} color={paused ? colors.textFaint : categoryColor[m.category]} complete={done} stroke={5}>
              {done ? <Icon name="check" size={22} color={colors.success} /> : <Text variant="smallStrong" tone={paused ? "faint" : "default"}>{Math.round(p.ratio * 100)}%</Text>}
            </Ring>
            <Text variant="small" tone={paused ? "faint" : "default"} align="center" numberOfLines={2} style={{ marginTop: 10, width: 96 }}>
              {m.title}
            </Text>
          </Pressable>
        );
      })}
      {onAdd ? (
        <Pressable onPress={onAdd} style={styles.item} scaleTo={0.96} accessibilityRole="button" accessibilityLabel="Add a goal" testID="add-goal">
          <View style={[styles.add, { borderColor: colors.lineStrong }]}>
            <Icon name="plus" size={22} color={colors.textMuted} />
          </View>
          <Text variant="small" tone="muted" align="center" style={{ marginTop: 10, width: 96 }}>
            Add a goal
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.xl, gap: 12 },
  item: { alignItems: "center", width: 100 },
  add: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
});
