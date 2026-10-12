import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from "react-native-reanimated";
import {
  SUGGESTED_GOALS,
  createDemoState,
  formatDeadline,
  formatMinutes,
  parseGoal,
  type PlanDraft,
  type Timeframe,
} from "@sprint/core";
import { Screen } from "./Screen";
import { Text } from "./Text";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Pressable } from "./Pressable";
import { Icon } from "./Icon";
import { Dial } from "./Dial";
import { VoiceButton } from "./VoiceButton";
import { CalendarPicker } from "./CalendarPicker";
import { Wordmark } from "./Wordmark";
import { Title } from "./Title";
import { useVoice } from "@/hooks/useVoice";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useStore } from "@/store/store";
import { aiProviderFor } from "@/store/providers";
import { haptics } from "@/platform/haptics";
import { radius, space, fonts } from "@/theme/tokens";

type Step = "input" | "timeframe" | "planning" | "clarify" | "review" | "error";

const TIMEFRAMES: Array<{ label: string; value: Timeframe | "date" }> = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "Pick a date", value: "date" },
  { label: "Long term", value: "long_term" },
];

export function GoalFlow({ firstRun }: { firstRun: boolean }) {
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const router = useRouter();
  const dispatch = useStore((s) => s.dispatch);
  const aiEnabled = useStore((s) => s.state.preferences.ai);
  const missionCount = useStore((s) => Object.keys(s.state.missions).length);
  const params = useLocalSearchParams<{ text?: string }>();

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState(params.text ?? "");
  const [source, setSource] = useState<"typed" | "voice" | "suggested">(params.text ? "voice" : "typed");
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [deadline, setDeadline] = useState<number | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [plan, setPlan] = useState<PlanDraft | undefined>();
  const [answer, setAnswer] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<number | undefined>(0);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const parsed = useMemo(() => (text.trim() ? parseGoal(text, Date.now()) : undefined), [text]);

  const voice = useVoice((t) => {
    setText(t);
    setSource("voice");
  });

  const runPlanner = useCallback(
    async (clarificationAnswer?: string) => {
      setStep("planning");
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const req: Parameters<ReturnType<typeof aiProviderFor>["planMission"]>[0] = { goalText: text.trim(), timeframe, now: Date.now() };
        if (deadline !== undefined) req.deadline = deadline;
        if (clarificationAnswer) req.clarificationAnswer = clarificationAnswer;
        const draft = await aiProviderFor(aiEnabled).planMission(req, controller.signal);
        if (controller.signal.aborted) return;
        setPlan(draft);
        setExpanded(0);
        setStep(draft.clarification && !clarificationAnswer ? "clarify" : "review");
      } catch {
        if (!controller.signal.aborted) setStep("error");
      }
    },
    [text, timeframe, deadline, aiEnabled],
  );

  const next = useCallback(() => {
    if (!text.trim()) return;
    Keyboard.dismiss();
    if (parsed?.deadline !== undefined) {
      setDeadline(undefined);
      runPlanner();
    } else {
      setStep("timeframe");
    }
  }, [text, parsed, runPlanner]);

  const create = useCallback(() => {
    if (!plan) return;
    haptics.trigger("sprint_start");
    dispatch({ type: "mission/create", goalText: text.trim(), plan, source, now: Date.now(), priority: missionCount === 0 ? 1 : 2 });
    dispatch({ type: "daily/build", now: Date.now() });
    if (firstRun) router.replace("/home");
    else router.dismissTo("/home");
  }, [plan, dispatch, text, source, router, missionCount]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loadDemo = useCallback(() => {
    dispatch({ type: "data/replace", state: createDemoState(Date.now()) });
    router.replace("/home");
  }, [dispatch, router]);

  const totalMinutes = plan ? plan.milestones.reduce((a, m) => a + m.sprints.reduce((x, s) => x + s.durationMin, 0), 0) : 0;
  const sprintCount = plan ? plan.milestones.reduce((a, m) => a + m.sprints.length, 0) : 0;

  return (
    <Screen maxWidth={640} testID="goal-flow">
      <Title>{firstRun ? "Sprint" : "New goal"}</Title>
      <View style={styles.top}>
        {firstRun ? <Wordmark size={16} /> : <View />}
        {!firstRun ? (
          <Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Close" testID="goal-close">
            <Icon name="close" size={20} />
          </Pressable>
        ) : null}
      </View>

      {step === "input" ? (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ flex: 1 }}>
          <View style={{ height: isDesktop ? 64 : 36 }} />
          <Text variant="label" tone="muted">
            {firstRun ? "Welcome" : "New goal"}
          </Text>
          <Text variant="display" style={{ marginTop: space.md, fontSize: isDesktop ? 52 : 40, lineHeight: isDesktop ? 56 : 44 }}>
            What do you want to achieve?
          </Text>
          <View style={[styles.inputWrap, { borderColor: text ? colors.lineStrong : colors.line, backgroundColor: colors.surface }]}>
            <TextInput
              ref={inputRef}
              value={voice.listening && voice.partial ? voice.partial : text}
              onChangeText={(t) => {
                setText(t);
                setSource("typed");
              }}
              placeholder={voice.listening ? "Listening…" : "Launch my website by Christmas"}
              placeholderTextColor={colors.textFaint}
              multiline
              autoFocus={Platform.OS !== "web" || isDesktop}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={next}
              style={[styles.input, { color: colors.text }]}
              accessibilityLabel="Your goal"
              testID="goal-input"
              maxLength={240}
            />
            <VoiceButton voice={voice} size={48} />
          </View>
          {voice.permission === "blocked" || voice.permission === "unavailable" || voice.error ? (
            <Text variant="caption" tone="faint" style={{ marginTop: space.sm }}>
              {voice.permission === "unavailable" ? "Voice isn't available here. Typing works just as well." : voice.permission === "blocked" ? "Microphone is blocked in your settings. Typing works just as well." : voice.error === "no-speech" ? "Didn't catch that. Try again, or type instead." : "Voice didn't work this time. Typing works just as well."}
            </Text>
          ) : null}
          {parsed?.deadlinePhrase ? (
            <Animated.View entering={FadeInDown.duration(220)} style={[styles.hint, { backgroundColor: colors.accentSoft }]}>
              <Icon name="calendar" size={16} color={colors.accentStrong} />
              <Text variant="small" style={{ marginLeft: 8, color: colors.accentStrong }}>
                By {parsed.deadlinePhrase} · {formatDeadline(parsed.deadline!, Date.now())}
              </Text>
            </Animated.View>
          ) : null}

          <View style={{ marginTop: space.xl }}>
            <Button label="Continue" size="lg" onPress={next} disabled={!text.trim()} iconRight={<Icon name="arrow-right" size={18} color={colors.accentText} />} testID="goal-continue" />
          </View>

          <View style={{ marginTop: space.xxl }}>
            <Text variant="label" tone="faint">
              Or start with
            </Text>
            <View style={styles.chips}>
              {SUGGESTED_GOALS.map((g) => (
                <Chip
                  key={g.text}
                  label={g.text}
                  size="sm"
                  onPress={() => {
                    setText(g.text);
                    setSource("suggested");
                    inputRef.current?.focus();
                  }}
                  testID={`suggest-${g.text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                />
              ))}
            </View>
          </View>
          {firstRun ? (
            <Pressable onPress={loadDemo} style={{ marginTop: space.xxl, alignSelf: "flex-start", minHeight: 44, justifyContent: "center" }} accessibilityRole="button" testID="load-demo">
              <Text variant="small" tone="muted">
                Just looking? <Text variant="smallStrong">See an example mission</Text>
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {step === "timeframe" ? (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)}>
          <View style={{ height: isDesktop ? 64 : 36 }} />
          <Text variant="label" tone="muted" numberOfLines={1}>
            {parsed?.objective}
          </Text>
          <Text variant="display" style={{ marginTop: space.md }}>
            When would you like this done?
          </Text>
          <Text tone="muted" style={{ marginTop: space.md }}>
            A rough answer is fine. The plan adapts as you go.
          </Text>
          <View style={[styles.chips, { marginTop: space.xl }]}>
            {TIMEFRAMES.map((t) => (
              <Chip
                key={t.value}
                label={t.value === "date" && deadline ? formatDeadline(deadline, Date.now()) : t.label}
                selected={t.value === "date" ? deadline !== undefined : deadline === undefined && timeframe === t.value}
                onPress={() => {
                  haptics.trigger("selection");
                  if (t.value === "date") {
                    setShowCalendar(true);
                  } else {
                    setDeadline(undefined);
                    setShowCalendar(false);
                    setTimeframe(t.value);
                  }
                }}
                testID={`timeframe-${t.value}`}
              />
            ))}
          </View>
          {showCalendar ? (
            <Animated.View entering={FadeInDown.duration(220)} style={{ marginTop: space.lg }}>
              <CalendarPicker
                value={deadline}
                onChange={(d) => {
                  setDeadline(d);
                  setTimeframe("custom");
                  setShowCalendar(false);
                }}
              />
            </Animated.View>
          ) : null}
          <View style={{ flexDirection: "row", marginTop: space.xxl, alignItems: "center" }}>
            <Button label="Back" variant="ghost" onPress={() => setStep("input")} />
            <View style={{ width: space.md }} />
            <Button label="Plan it" size="lg" onPress={() => runPlanner()} iconRight={<Icon name="sparkle" size={16} color={colors.accentText} />} testID="goal-plan" />
          </View>
        </Animated.View>
      ) : null}

      {step === "planning" ? (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.centered} testID="planning">
          <Dial size={220} progress={1} transitionMs={1400} status="running" label="Planning">
            <Icon name="sparkle" size={34} color={colors.accent} />
          </Dial>
          <Text variant="heading" align="center" style={{ marginTop: space.xl }}>
            Shaping your plan
          </Text>
          <Text tone="muted" align="center" style={{ marginTop: space.sm, maxWidth: 320 }}>
            Breaking it into milestones and short sprints you can start today.
          </Text>
        </Animated.View>
      ) : null}

      {step === "clarify" && plan?.clarification ? (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)}>
          <View style={{ height: isDesktop ? 64 : 36 }} />
          <Text variant="label" tone="muted">
            One quick question
          </Text>
          <Text variant="display" style={{ marginTop: space.md }}>
            {plan.clarification.question}
          </Text>
          <Text tone="muted" style={{ marginTop: space.md }}>
            One answer makes a much better plan than a guess.
          </Text>
          <View style={[styles.chips, { marginTop: space.xl }]}>
            {plan.clarification.options.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={answer === o.value}
                onPress={() => {
                  setAnswer(o.value);
                  runPlanner(o.value);
                }}
                testID={`clarify-${o.value}`}
              />
            ))}
          </View>
          <Pressable onPress={() => setStep("review")} style={{ marginTop: space.xl, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }} accessibilityRole="button">
            <Text variant="small" tone="muted">
              Skip, use the general plan
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {step === "review" && plan ? (
        <Animated.View entering={FadeIn.duration(350)} testID="plan-review">
          <View style={{ height: isDesktop ? 40 : 20 }} />
          <Text variant="label" tone="muted">
            Your mission
          </Text>
          <Text variant="title" style={{ marginTop: space.sm, fontSize: 32, lineHeight: 38 }}>
            {plan.title}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="small" tone="muted">
              {plan.milestones.length} milestones · {sprintCount} sprints · {formatMinutes(totalMinutes)}
            </Text>
            {plan.deadline !== undefined ? (
              <Text variant="small" tone="muted">
                {" "}
                · {formatDeadline(plan.deadline, Date.now())}
              </Text>
            ) : null}
          </View>
          <View style={[styles.explain, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Icon name="sparkle" size={16} color={colors.accent} />
            <Text variant="small" style={{ marginLeft: 10, flex: 1 }}>
              {plan.explanation}
            </Text>
          </View>

          <View style={{ marginTop: space.xl }}>
            {plan.milestones.map((m, i) => {
              const open = expanded === i;
              const mins = m.sprints.reduce((a, s) => a + s.durationMin, 0);
              return (
                <Animated.View key={i} layout={Layout.duration(200)} style={[styles.milestone, { borderColor: colors.line }]}>
                  <Pressable onPress={() => setExpanded(open ? undefined : i)} style={styles.milestoneHead} scaleTo={0.995} accessibilityRole="button" accessibilityState={{ expanded: open }} testID={`milestone-${i}`}>
                    <View style={[styles.index, { borderColor: colors.lineStrong }]}>
                      <Text variant="caption" tone="muted">
                        {i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="subheading">{m.title}</Text>
                      <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {m.sprints.length} sprint{m.sprints.length === 1 ? "" : "s"} · {formatMinutes(mins)}
                      </Text>
                    </View>
                    <Icon name={open ? "chevron-down" : "chevron-right"} size={18} color={colors.textFaint} />
                  </Pressable>
                  {open
                    ? m.sprints.map((s, j) => (
                        <View key={j} style={styles.sprintRow}>
                          <View style={[styles.dot, { borderColor: colors.lineStrong }]} />
                          <Text style={{ flex: 1 }}>{s.title}</Text>
                          <Text variant="small" tone="muted">
                            {s.durationMin} min
                          </Text>
                        </View>
                      ))
                    : null}
                </Animated.View>
              );
            })}
          </View>

          <View style={{ marginTop: space.xl }}>
            <Button label="Start this mission" size="xl" full onPress={create} testID="plan-create" />
            <View style={{ flexDirection: "row", marginTop: space.md, justifyContent: "space-between" }}>
              <Button label="Change goal" variant="ghost" onPress={() => setStep("input")} />
              <Button label="Change timing" variant="ghost" onPress={() => setStep("timeframe")} />
            </View>
            <Text variant="caption" tone="faint" style={{ marginTop: space.lg }}>
              You can edit every sprint, change the deadline, or pause the mission at any time. Nothing here is fixed.
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {step === "error" ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.centered}>
          <Text variant="heading" align="center">
            Something interrupted the planning
          </Text>
          <Text tone="muted" align="center" style={{ marginTop: space.sm, maxWidth: 320 }}>
            Your goal is safe. Let's try again.
          </Text>
          <View style={{ marginTop: space.xl }}>
            <Button label="Try again" onPress={() => runPlanner(answer)} />
          </View>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -12 },
  inputWrap: { marginTop: space.xl, borderWidth: 1, borderRadius: radius.lg, padding: 10, paddingLeft: 18, flexDirection: "row", alignItems: "flex-end" },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 20, lineHeight: 28, minHeight: 72, maxHeight: 160, paddingVertical: 10, paddingRight: 10, textAlignVertical: "top" },
  hint: { marginTop: space.md, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.md },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: space.sm },
  explain: { marginTop: space.lg, flexDirection: "row", alignItems: "flex-start", padding: 14, borderRadius: radius.md, borderWidth: 1 },
  milestone: { borderTopWidth: 1, paddingVertical: 6 },
  milestoneHead: { flexDirection: "row", alignItems: "center", paddingVertical: 12, minHeight: 56 },
  index: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 14 },
  sprintRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingLeft: 42 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginRight: 12 },
});
