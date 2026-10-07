import React from "react";
import { StyleSheet } from "react-native";
import { Pressable } from "./Pressable";
import { Text } from "./Text";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  testID?: string;
}

export function Chip({ label, selected, onPress, size = "md", testID }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      testID={testID}
      style={[
        styles.chip,
        size === "sm" ? styles.sm : null,
        { backgroundColor: selected ? colors.text : colors.surfaceStrong, borderColor: selected ? colors.text : colors.line },
      ]}
    >
      <Text variant={size === "sm" ? "smallStrong" : "bodyStrong"} style={{ color: selected ? colors.bg : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 16, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  sm: { paddingHorizontal: 12, height: 34 },
});
