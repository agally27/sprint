import React from "react";
import { View } from "react-native";
import { Screen } from "./Screen";
import { Text } from "./Text";
import { Button } from "./Button";
import { Wordmark } from "./Wordmark";
import { space } from "@/theme/tokens";

/** Calm fallback for crashes and unknown routes. Progress is never at risk: it's already saved. */
export function Fallback({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel: string; onAction: () => void }) {
  return (
    <Screen scroll={false} testID="fallback">
      <Wordmark size={16} />
      <View style={{ flex: 1, justifyContent: "center", paddingBottom: space.xxxl }}>
        <Text variant="display">{title}</Text>
        <Text tone="muted" style={{ marginTop: space.md, maxWidth: 420 }}>
          {body}
        </Text>
        <View style={{ marginTop: space.xl, flexDirection: "row" }}>
          <Button label={actionLabel} onPress={onAction} testID="fallback-action" />
        </View>
      </View>
    </Screen>
  );
}
