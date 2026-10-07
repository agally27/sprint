import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text } from "./Text";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";

/** The Sprint mark: a ring that is almost closed, and the name. */
export function Wordmark({ size = 18, showName = true, color }: { size?: number; showName?: boolean; color?: string }) {
  const { colors } = useTheme();
  const tint = color ?? colors.text;
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Sprint">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={tint} strokeOpacity={0.25} strokeWidth={2.2} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.accent} strokeWidth={2.2} fill="none" strokeDasharray={`${c * 0.78} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {showName ? (
        <Text style={{ fontFamily: fonts.sansExtrabold, fontSize: size * 0.8, letterSpacing: size * 0.18, color: tint, marginLeft: size * 0.5 }}>SPRINT</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center" } });
