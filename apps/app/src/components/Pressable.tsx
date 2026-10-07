import React, { useCallback } from "react";
import { Pressable as RNPressable, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { haptics } from "@/platform/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressableProps extends Omit<RNPressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Scale on press. 0.97 for buttons, 0.99 for cards. */
  scaleTo?: number;
  haptic?: boolean;
  children?: React.ReactNode;
}

/** A pressable with a gentle, premium press response. */
export function Pressable({ style, scaleTo = 0.97, haptic = false, onPressIn, onPressOut, onPress, children, ...rest }: PressableProps) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handleIn = useCallback<NonNullable<RNPressableProps["onPressIn"]>>(
    (e) => {
      if (!reduced) scale.value = withTiming(scaleTo, { duration: 90 });
      onPressIn?.(e);
    },
    [onPressIn, reduced, scale, scaleTo],
  );
  const handleOut = useCallback<NonNullable<RNPressableProps["onPressOut"]>>(
    (e) => {
      scale.value = withSpring(1, { damping: 18, stiffness: 260 });
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );
  const handlePress = useCallback<NonNullable<RNPressableProps["onPress"]>>(
    (e) => {
      if (haptic) haptics.trigger("selection");
      onPress?.(e);
    },
    [haptic, onPress],
  );
  return (
    <AnimatedPressable {...rest} onPress={handlePress} onPressIn={handleIn} onPressOut={handleOut} style={[animated, style]}>
      {children}
    </AnimatedPressable>
  );
}
