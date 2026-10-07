import React from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { space } from "@/theme/tokens";

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  /** Max content width on large screens. */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
}

/** Safe-area aware container with a comfortable max width on desktop. */
export function Screen({ children, scroll = true, maxWidth = 680, style, contentStyle, padded = true, testID }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const pad = padded ? (isDesktop ? space.xxl : space.xl) : 0;
  const inner = [
    styles.inner,
    { maxWidth, paddingHorizontal: pad, paddingTop: Math.max(insets.top, isDesktop ? space.xxl : space.lg), paddingBottom: Math.max(insets.bottom, space.xl) + space.xl },
    contentStyle,
  ];
  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, style]} testID={testID}>
        <View style={inner}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.bg }, style]} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" testID={testID}>
      <View style={inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center" },
  inner: { width: "100%", flex: 1, alignSelf: "center" },
});
