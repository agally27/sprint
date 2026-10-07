import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Pressable } from "./Pressable";
import { Icon } from "./Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { VoiceSession } from "@/hooks/useVoice";

export function VoiceButton({ voice, size = 56 }: { voice: VoiceSession; size?: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(pulse);
    if (voice.listening && !reduced) {
      pulse.value = withRepeat(withSequence(withTiming(1.35, { duration: 900, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) })), -1, false);
    } else pulse.value = withTiming(1, { duration: 200 });
  }, [voice.listening, reduced, pulse]);
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: voice.listening ? 0.35 : 0 }));

  const unavailable = voice.permission === "unavailable" || !voice.enabled;
  const label = voice.listening ? "Stop listening" : voice.permission === "blocked" ? "Microphone blocked. Open settings to allow it." : "Speak your goal";
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[styles.halo, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent }, halo]} pointerEvents="none" />
      <Pressable
        onPress={() => (voice.listening ? voice.stop() : voice.listen())}
        disabled={unavailable}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: unavailable }}
        testID="voice-button"
        scaleTo={0.92}
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: voice.listening ? colors.accent : colors.surfaceStrong, borderColor: colors.line, opacity: unavailable ? 0.4 : 1 },
        ]}
      >
        <Icon name="mic" size={size * 0.42} color={voice.listening ? colors.accentText : colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: "absolute" },
  button: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
