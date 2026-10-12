import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";

export interface RingProps {
  size?: number;
  progress: number;
  color?: string;
  stroke?: number;
  children?: React.ReactNode;
  /** Draw a faint full ring for completed missions. */
  complete?: boolean;
}

/** Static progress ring for missions and milestones. Cheap, no animation. */
export function Ring({ size = 64, progress, color, stroke, children, complete }: RingProps) {
  const { colors } = useTheme();
  const w = stroke ?? Math.max(3, size * 0.07);
  const r = size / 2 - w / 2 - 1;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, complete ? 1 : progress));
  const tint = complete ? colors.success : (color ?? colors.accent);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.ringTrack} strokeWidth={w} fill="none" />
          {p > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} stroke={tint} strokeWidth={w} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} strokeLinecap="round" /> : null}
        </G>
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});
