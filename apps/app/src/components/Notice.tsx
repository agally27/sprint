import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Pressable } from "./Pressable";
import { Icon, type IconName } from "./Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

/** The coach speaks here: one line, calm, dismissible. */
export function Notice({ text, icon = "sparkle", onDismiss, tone = "default", testID }: { text: string; icon?: IconName; onDismiss?: () => void; tone?: "default" | "accent"; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: tone === "accent" ? colors.accentSoft : colors.surface, borderColor: tone === "accent" ? "transparent" : colors.line }]} testID={testID}>
      <Icon name={icon} size={16} color={colors.accent} />
      <Text variant="small" style={{ flex: 1, marginLeft: 10 }}>
        {text}
      </Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.dismiss} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Icon name="close" size={16} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: space.md },
  dismiss: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginRight: -8 },
});
