import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./Text";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type DialStatus = "idle" | "countdown" | "running" | "paused" | "complete";

export interface DialProps {
  size?: number;
  /** 0 → 1, how much of the sprint has elapsed. */
  progress: number;
  /** Big text in the centre, usually mm:ss. */
  primary?: string;
  label?: string;
  sublabel?: string;
  status?: DialStatus;
  /** Override the accent, e.g. a mission colour. */
  color?: string;
  children?: React.ReactNode;
  /** How long to animate towards a new progress value. 1000 for a ticking timer. */
  transitionMs?: number;
  testID?: string;
}

/**
 * The Sprint dial. One ring, one number, a lot of whitespace.
 * The ring closes as the sprint progresses so finishing feels like completion.
 */
export function Dial({ size = 300, progress, primary, label, sublabel, status = "idle", color, children, transitionMs = 1000, testID }: DialProps) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const stroke = Math.max(5, Math.round(size * 0.022));
  const glow = stroke * 3.2;
  const r = size / 2 - glow / 2 - 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  const accent = status === "complete" ? colors.success : (color ?? colors.accent);
  const accentSoft = status === "complete" ? palette.mint : color ? color : palette.emberLight;

  const anim = useSharedValue(progress);
  const breathe = useSharedValue(1);
  const glowOpacity = useSharedValue(status === "running" ? 1 : 0.5);

  useEffect(() => {
    const target = Math.max(0, Math.min(1, progress));
    anim.value = reduced ? target : withTiming(target, { duration: status === "complete" ? 700 : transitionMs, easing: status === "complete" ? Easing.out(Easing.cubic) : Easing.linear });
  }, [progress, anim, transitionMs, status, reduced]);

  useEffect(() => {
    cancelAnimation(breathe);
    if (status === "running" && !reduced) {
      breathe.value = withRepeat(withSequence(withTiming(1.012, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) })), -1, false);
    } else {
      breathe.value = withTiming(1, { duration: 300 });
    }
    glowOpacity.value = withTiming(status === "running" ? 1 : status === "complete" ? 1 : 0.45, { duration: 500 });
  }, [status, reduced, breathe, glowOpacity]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - anim.value) }));
  const glowProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - anim.value), opacity: glowOpacity.value * (isDark ? 0.32 : 0.2) }));
  const headProps = useAnimatedProps(() => {
    const angle = -Math.PI / 2 + anim.value * 2 * Math.PI;
    return { cx: center + r * Math.cos(angle), cy: center + r * Math.sin(angle), opacity: anim.value > 0.004 && anim.value < 0.996 ? 1 : 0 };
  });
  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));

  const ticks = useMemo(() => {
    const out: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
    const inner = r - stroke * 1.9;
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const len = major ? stroke * 1.1 : stroke * 0.55;
      out.push({ x1: center + (inner - len) * Math.cos(a), y1: center + (inner - len) * Math.sin(a), x2: center + inner * Math.cos(a), y2: center + inner * Math.sin(a), major });
    }
    return out;
  }, [center, r, stroke]);

  const muted = status === "paused";
  const gradId = `dial-${Math.round(size)}-${status}`;

  return (
    <Animated.View style={[{ width: size, height: size }, breatheStyle]} testID={testID} accessibilityRole="timer" accessibilityLabel={`${primary ?? ""} ${label ?? ""}`.trim()}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} />
            <Stop offset="1" stopColor={accentSoft} />
          </LinearGradient>
        </Defs>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {/* Light */}
          <AnimatedCircle cx={center} cy={center} r={r} stroke={accent} strokeWidth={glow} fill="none" strokeDasharray={`${c} ${c}`} strokeLinecap="round" animatedProps={glowProps} />
          {/* Track */}
          <Circle cx={center} cy={center} r={r} stroke={colors.ringTrack} strokeWidth={stroke} fill="none" />
          {/* Progress */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={r}
            stroke={muted ? colors.textFaint : `url(#${gradId})`}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeLinecap="round"
            animatedProps={arcProps}
          />
        </G>
        {/* Ticks */}
        <G opacity={isDark ? 0.22 : 0.16}>
          {ticks.map((t, i) => (
            <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={colors.text} strokeWidth={t.major ? 1.4 : 1} strokeLinecap="round" />
          ))}
        </G>
        {/* Head */}
        <AnimatedCircle r={stroke * 0.95} fill={muted ? colors.textFaint : accentSoft} animatedProps={headProps} />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children ?? (
          <>
            {label ? (
              <Text variant="label" tone={muted ? "faint" : "muted"} align="center" numberOfLines={1} style={{ maxWidth: size * 0.6 }}>
                {label}
              </Text>
            ) : null}
            {primary ? (
              <Text variant="numeral" tone={muted ? "muted" : "default"} align="center" style={{ fontSize: size * 0.22, lineHeight: size * 0.26, marginTop: size * 0.01 }} testID={testID ? `${testID}-time` : undefined}>
                {primary}
              </Text>
            ) : null}
            {sublabel ? (
              <Text variant="label" tone="faint" align="center" numberOfLines={1} style={{ maxWidth: size * 0.6, marginTop: size * 0.01 }}>
                {sublabel}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
});
