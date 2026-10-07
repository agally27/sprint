import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Pressable } from "./Pressable";
import { space } from "@/theme/tokens";

export function SectionHeader({ title, action, onAction, testID }: { title: string; action?: string; onAction?: () => void; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.action} testID={testID}>
          <Text variant="smallStrong" tone="muted">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.md, marginTop: space.xxl, minHeight: 24 },
  action: { minHeight: 44, justifyContent: "center", marginVertical: -10 },
});
