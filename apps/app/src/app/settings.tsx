import React, { useCallback, useState } from "react";
import { Platform, Share, StyleSheet, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { createDemoState, serialize, type Preferences, type ThemePref } from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Title } from "@/components/Title";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Chip } from "@/components/Chip";
import { SectionHeader } from "@/components/SectionHeader";
import { Confirm } from "@/components/Sheet";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/ThemeProvider";
import { providers, remoteAI } from "@/store/providers";
import { config } from "@/lib/config";
import { fonts, radius, space } from "@/theme/tokens";

function Row({ label, detail, value, onChange, testID }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <View style={{ flex: 1, marginRight: space.lg }}>
        <Text>{label}</Text>
        {detail ? (
          <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.lineStrong }}
        thumbColor="#fff"
        {...({ activeThumbColor: "#fff" } as object)}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

export default function Settings() {
  const router = useRouter();
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const dispatch = useStore((s) => s.dispatch);
  const prefs = state.preferences;
  const [name, setName] = useState(prefs.name ?? "");
  const [confirm, setConfirm] = useState<"reset" | "demo" | undefined>();
  const [exported, setExported] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string | undefined>();

  const set = useCallback((patch: Partial<Preferences>) => dispatch({ type: "prefs/set", patch, now: Date.now() }), [dispatch]);
  const setNotif = useCallback((patch: Partial<Preferences["notifications"]>) => set({ notifications: { ...prefs.notifications, ...patch } }), [set, prefs.notifications]);

  const requestNotifications = useCallback(async () => {
    const r = await providers.notifications.requestPermission();
    dispatch({ type: "permissions/set", key: "notifications", state: r });
    setNotifStatus(
      r === "granted"
        ? "Notifications are on."
        : r === "blocked"
          ? "Blocked in system settings. Sprint works fine without them."
          : r === "unavailable"
            ? "Not available here."
            : "Not allowed. Sprint works fine without them.",
    );
  }, [dispatch]);

  const exportData = useCallback(async () => {
    const json = serialize(state);
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(json);
      } else {
        await Share.share({ message: json, title: "Sprint data" });
      }
      setExported(true);
    } catch {
      setExported(false);
    }
  }, [state]);

  return (
    <Screen maxWidth={640} testID="settings">
      <Title>Settings</Title>
      <View style={styles.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} style={styles.back} accessibilityRole="button" accessibilityLabel="Back" testID="settings-back">
          <Icon name="arrow-left" size={22} />
        </Pressable>
        <Text variant="label" tone="muted">
          Settings
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <SectionHeader title="You" />
      <Text variant="caption" tone="muted">
        Your name, for the greeting. Optional.
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={() => set(name.trim() ? { name: name.trim() } : { name: undefined })}
        placeholder="First name"
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { color: colors.text, borderColor: colors.line }]}
        accessibilityLabel="Your name"
        testID="settings-name"
      />

      <SectionHeader title="Appearance" />
      <View style={styles.chips}>
        {(["system", "light", "dark"] as ThemePref[]).map((t) => (
          <Chip key={t} label={t === "system" ? "System" : t === "light" ? "Light" : "Dark"} size="sm" selected={prefs.theme === t} onPress={() => set({ theme: t })} testID={`theme-${t}`} />
        ))}
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: space.lg }}>
        Motion
      </Text>
      <View style={styles.chips}>
        {(["system", "reduced", "full"] as Preferences["motion"][]).map((m) => (
          <Chip key={m} label={m === "system" ? "Follow system" : m === "reduced" ? "Reduced" : "Full"} size="sm" selected={prefs.motion === m} onPress={() => set({ motion: m })} />
        ))}
      </View>

      <SectionHeader title="Sprints" />
      <Text variant="caption" tone="muted">
        Default sprint length for sprints you add yourself.
      </Text>
      <View style={styles.chips}>
        {[15, 25, 45, 60].map((m) => (
          <Chip key={m} label={`${m} min`} size="sm" selected={prefs.defaultSprintMin === m} onPress={() => set({ defaultSprintMin: m })} />
        ))}
      </View>
      <View style={{ marginTop: space.lg }}>
        <Row label="Haptics" detail="Subtle feedback when sprints start and finish." value={prefs.haptics} onChange={(v) => set({ haptics: v })} testID="toggle-haptics" />
        <Row label="Sound" detail="Quiet tones for the countdown and completion." value={prefs.sound} onChange={(v) => set({ sound: v })} testID="toggle-sound" />
        <Row label="Voice" detail="Speak goals and commands with the microphone." value={prefs.voice} onChange={(v) => set({ voice: v })} testID="toggle-voice" />
      </View>

      <SectionHeader title="Notifications" />
      <Row label="All notifications" value={prefs.notifications.enabled} onChange={(v) => setNotif({ enabled: v })} testID="toggle-notifications" />
      {prefs.notifications.enabled ? (
        <>
          <Row label="Sprint reminders" detail="When a sprint ends." value={prefs.notifications.sprintReminders} onChange={(v) => setNotif({ sprintReminders: v })} />
          <Row label="Goal reminders" detail="Deadlines and missions that have gone quiet." value={prefs.notifications.goalReminders} onChange={(v) => setNotif({ goalReminders: v })} />
          <Row label="Suggestions" detail="A morning nudge with one good sprint." value={prefs.notifications.aiSuggestions} onChange={(v) => setNotif({ aiSuggestions: v })} />
          <Row
            label="Quiet hours"
            detail={`${prefs.notifications.quietHours.start} – ${prefs.notifications.quietHours.end}. Nothing but sprint endings.`}
            value={prefs.notifications.quietHours.enabled}
            onChange={(v) => setNotif({ quietHours: { ...prefs.notifications.quietHours, enabled: v } })}
          />
          <View style={{ marginTop: space.lg, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <Button
              label={state.permissions.notifications === "granted" ? "Permission granted" : "Allow notifications"}
              size="sm"
              variant="secondary"
              onPress={requestNotifications}
              disabled={state.permissions.notifications === "granted"}
              testID="allow-notifications"
            />
            {notifStatus ? (
              <Text variant="caption" tone="muted">
                {notifStatus}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      <SectionHeader title="AI" />
      <Row
        label="AI planning"
        detail={
          remoteAI
            ? "Plans come from Sprint AI. Your goal text is sent to the Sprint API to make the plan; nothing else is."
            : "No AI service configured. Plans are built on this device from Sprint's own playbooks."
        }
        value={prefs.ai}
        onChange={(v) => set({ ai: v })}
        testID="toggle-ai"
      />
      <Row label="Generated visuals" detail="Mission artwork, when a provider is configured. Off means palettes only." value={prefs.generatedVisuals} onChange={(v) => set({ generatedVisuals: v })} />
      <Text variant="caption" tone="faint" style={{ marginTop: space.md }}>
        Everything else, including goals, plans, sprints and history, stays on this device.
      </Text>

      <SectionHeader title="Data" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button label={exported ? (Platform.OS === "web" ? "Copied" : "Shared") : "Export data"} size="sm" variant="secondary" onPress={exportData} testID="export-data" />
        <Button label="Load example data" size="sm" variant="secondary" onPress={() => setConfirm("demo")} testID="load-demo-settings" />
        <Button label="Delete everything" size="sm" variant="danger" onPress={() => setConfirm("reset")} testID="delete-everything" />
      </View>

      <SectionHeader title="About" />
      <Text variant="small" tone="muted">
        Sprint {config.version}. Turn goals into momentum.
      </Text>
      <Text variant="caption" tone="faint" style={{ marginTop: 6 }}>
        Microphone audio is processed by your device's speech service and never stored by Sprint.
      </Text>

      <Confirm
        visible={confirm === "reset"}
        title="Delete everything?"
        body="All goals, missions, sprints and history on this device are removed. Preferences stay. This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Keep my data"
        destructive
        onConfirm={() => {
          setConfirm(undefined);
          dispatch({ type: "data/reset", now: Date.now() });
          router.replace("/onboarding");
        }}
        onCancel={() => setConfirm(undefined)}
      />
      <Confirm
        visible={confirm === "demo"}
        title="Load example data?"
        body="This replaces what's on this device with an example mission so you can explore Sprint."
        confirmLabel="Load example"
        cancelLabel="Cancel"
        onConfirm={() => {
          setConfirm(undefined);
          dispatch({ type: "data/replace", state: { ...createDemoState(Date.now()), preferences: prefs } });
          router.dismissTo("/home");
        }}
        onCancel={() => setConfirm(undefined)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, minHeight: 56 },
  input: { marginTop: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: fonts.sans, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.sm },
});
