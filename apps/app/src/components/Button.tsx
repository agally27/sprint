import React from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Pressable } from "./Pressable";
import { Text } from "./Text";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
  testID?: string;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = "primary", size = "md", disabled, loading, icon, iconRight, style, full, testID, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const heights: Record<Size, number> = { sm: 38, md: 48, lg: 56, xl: 64 };
  const paddings: Record<Size, number> = { sm: 14, md: 20, lg: 26, xl: 32 };
  const bg =
    variant === "primary" ? colors.accent : variant === "success" ? colors.success : variant === "secondary" ? colors.surfaceStrong : variant === "danger" ? "transparent" : "transparent";
  const fg = variant === "primary" ? colors.accentText : variant === "success" ? "#06281A" : variant === "danger" ? colors.danger : colors.text;
  const border = variant === "ghost" ? colors.lineStrong : variant === "danger" ? colors.lineStrong : "transparent";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      haptic={variant === "primary"}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      testID={testID}
      style={[
        styles.base,
        { height: heights[size], paddingHorizontal: paddings[size], backgroundColor: bg, borderColor: border, borderWidth: border === "transparent" ? 0 : 1, borderRadius: radius.pill },
        full ? { alignSelf: "stretch" } : null,
        disabled ? { opacity: 0.45 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={{ marginRight: space.sm }}>{icon}</View> : null}
          <Text variant={size === "xl" ? "subheading" : size === "sm" ? "smallStrong" : "bodyStrong"} style={{ color: fg, letterSpacing: size === "xl" ? 0.2 : 0 }}>
            {label}
          </Text>
          {iconRight ? <View style={{ marginLeft: space.sm }}>{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", alignSelf: "flex-start", minWidth: 44 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
