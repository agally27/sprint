import React from "react";
import { Modal, Platform, Pressable as RNPressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { Button } from "./Button";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { radius, space } from "@/theme/tokens";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
}

/** Bottom sheet on phones, centred dialog on larger screens. One component, consistent everywhere. */
export function Sheet({ visible, onClose, title, children, testID }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isPhone } = useBreakpoint();
  return (
    <Modal visible={visible} transparent animationType={Platform.OS === "web" ? "none" : "fade"} onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdropWrap, isPhone ? styles.bottom : styles.center]}>
        <RNPressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.bgElevated, borderColor: colors.line },
            isPhone ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: Math.max(insets.bottom, space.lg) + space.sm, width: "100%" } : { width: 460, maxWidth: "92%" },
          ]}
          testID={testID}
        >
          {isPhone ? <View style={[styles.grabber, { backgroundColor: colors.lineStrong }]} /> : null}
          {title ? (
            <Text variant="heading" style={{ marginBottom: space.lg }}>
              {title}
            </Text>
          ) : null}
          <ScrollView bounces={false} style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export interface ConfirmProps {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A calm confirmation. Never blames, always says what happens to progress. */
export function Confirm({ visible, title, body, confirmLabel = "Confirm", cancelLabel = "Keep going", destructive, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Sheet visible={visible} onClose={onCancel} title={title} testID="confirm">
      {body ? (
        <Text tone="muted" style={{ marginBottom: space.xl }}>
          {body}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} testID="confirm-cancel" />
        <Button label={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={onConfirm} testID="confirm-ok" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdropWrap: { flex: 1 },
  bottom: { justifyContent: "flex-end" },
  center: { alignItems: "center", justifyContent: "center" },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: space.xl, paddingTop: space.lg },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: space.lg },
});
