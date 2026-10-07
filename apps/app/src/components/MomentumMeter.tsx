import React from "react";
import { StyleSheet, View } from "react-native";
import { BAND_LABELS, band } from "@sprint/core";
import { Text } from "./Text";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

export function MomentumMeter({ score, compact, showLabel = true }: { score: number; compact?: boolean; showLabel?: boolean }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, score));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} accessibilityLabel={`Momentum ${Math.round(pct)}, ${BAND_LABELS[band(pct)]}`}>
      <View style={styles.row}>
        <Text variant="label" tone="muted">
          {showLabel ? "Momentum" : "Right now"}
        </Text>
        <Text variant={compact ? "smallStrong" : "bodyStrong"}>
          {BAND_LABELS[band(pct)]}
          <Text variant={compact ? "small" : "body"} tone="faint">
            {"  "}
            {Math.round(pct)}
          </Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
        <View style={[styles.fill, { width: `${Math.max(2, pct)}%`, backgroundColor: colors.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
  track: { height: 6, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: 6, borderRadius: radius.pill },
});
