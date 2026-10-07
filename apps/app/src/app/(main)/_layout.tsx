import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "@/components/Pressable";
import { Text } from "@/components/Text";
import { Icon, type IconName } from "@/components/Icon";
import { Wordmark } from "@/components/Wordmark";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { radius, space } from "@/theme/tokens";

const TABS: Array<{ name: string; href: string; label: string; icon: IconName }> = [
  { name: "home", href: "/home", label: "Today", icon: "home" },
  { name: "missions", href: "/missions", label: "Missions", icon: "missions" },
  { name: "progress", href: "/progress", label: "Progress", icon: "progress" },
];

function BottomBar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.bgElevated, borderTopColor: colors.line }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Pressable key={t.name} onPress={() => router.navigate(t.href as never)} style={styles.tab} scaleTo={0.94} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t.label} testID={`tab-${t.name}`}>
            <Icon name={t.icon} size={22} color={active ? colors.text : colors.textFaint} />
            <Text variant="caption" style={{ color: active ? colors.text : colors.textFaint, marginTop: 4, fontFamily: active ? "Manrope_700Bold" : "Manrope_500Medium" }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SideRail() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.rail, { backgroundColor: colors.bgElevated, borderRightColor: colors.line, paddingTop: insets.top + space.xl }]}>
      <View style={{ paddingHorizontal: space.lg, marginBottom: space.xxl }}>
        <Wordmark size={18} />
      </View>
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Pressable key={t.name} onPress={() => router.navigate(t.href as never)} style={[styles.railItem, active ? { backgroundColor: colors.surfaceStrong } : null]} scaleTo={0.98} accessibilityRole="tab" accessibilityState={{ selected: active }} testID={`tab-${t.name}`}>
            <Icon name={t.icon} size={20} color={active ? colors.text : colors.textMuted} />
            <Text variant={active ? "bodyStrong" : "body"} tone={active ? "default" : "muted"} style={{ marginLeft: 12 }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => router.push("/settings")} style={styles.railItem} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Settings">
        <Icon name="settings" size={20} color={colors.textMuted} />
        <Text tone="muted" style={{ marginLeft: 12 }}>
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

export default function MainLayout() {
  const { isDesktop } = useBreakpoint();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? "row" : "column", backgroundColor: colors.bg }}>
      {isDesktop ? <SideRail /> : null}
      <View style={{ flex: 1 }}>
        <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: "fade" }} tabBar={() => (isDesktop ? null : <BottomBar />)}>
          <Tabs.Screen name="home" />
          <Tabs.Screen name="missions" />
          <Tabs.Screen name="progress" />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1, paddingTop: 8, paddingHorizontal: space.md },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6, minHeight: 48 },
  rail: { width: 232, borderRightWidth: 1, paddingHorizontal: space.md, paddingBottom: space.xl },
  railItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: space.lg, borderRadius: radius.md, marginBottom: 4 },
});
