import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDays,
  formatDeadline,
  formatMinutes,
  milestoneSprints,
  missionHealth,
  missionMilestones,
  missionProgress,
  nextSprintFor,
  paletteFor,
  recommendNext,
  toDay,
  type Sprint,
} from "@sprint/core";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { Icon } from "@/components/Icon";
import { Ring } from "@/components/Ring";
import { Chip } from "@/components/Chip";
import { Sheet, Confirm } from "@/components/Sheet";
import { CalendarPicker } from "@/components/CalendarPicker";
import { SectionHeader } from "@/components/SectionHeader";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { startSprint } from "@/lib/actions";
import { categoryColor, fonts, radius, space } from "@/theme/tokens";

const HEALTH_COPY: Record<string, string> = {
  ahead: "You're ahead of plan.",
  on_track: "On track.",
  at_risk: "Tight on time. Let's keep the next step small.",
  open: "No deadline. Move at your own pace.",
  completed: "Complete.",
};

export default function MissionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useStore((s) => s.state);
  const dispatch = useStore((s) => s.dispatch);
  const mission = id ? state.missions[id] : undefined;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(mission?.title ?? "");
  const [priority, setPriority] = useState<1 | 2 | 3>(mission?.priority ?? 2);
  const [deadline, setDeadline] = useState<number | undefined>(mission?.deadline);
  const [showCalendar, setShowCalendar] = useState(false);
  const [sprintSheet, setSprintSheet] = useState<Sprint | undefined>();
  const [sprintTitle, setSprintTitle] = useState("");
  const [sprintMinutes, setSprintMinutes] = useState(25);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | undefined>();
  const [expandedAll, setExpandedAll] = useState(false);

  const progress = useMemo(() => (mission ? missionProgress(state, mission.id) : undefined), [state, mission]);
  const milestones = useMemo(() => (mission ? missionMilestones(state, mission.id) : []), [state, mission]);
  const next = useMemo(() => (mission ? nextSprintFor(state, mission.id) : undefined), [state, mission]);
  const rec = useMemo(() => (mission ? recommendNext(state, { now: Date.now(), preferMissionId: mission.id }) : undefined), [state, mission]);
  const health = mission ? missionHealth(state, mission, Date.now()) : "open";

  const openEdit = useCallback(() => {
    if (!mission) return;
    setTitle(mission.title);
    setPriority(mission.priority);
    setDeadline(mission.deadline);
    setShowCalendar(false);
    setEditing(true);
  }, [mission]);

  const saveEdit = useCallback(() => {
    if (!mission) return;
    const patch: { title?: string; priority?: 1 | 2 | 3; deadline?: number } = {};
    if (title.trim() && title.trim() !== mission.title) patch.title = title.trim();
    if (priority !== mission.priority) patch.priority = priority;
    const deadlineChanged = deadline !== mission.deadline;
    if (deadlineChanged) patch.deadline = deadline as number;
    if (Object.keys(patch).length > 0 || deadlineChanged) {
      const action: Parameters<typeof dispatch>[0] = { type: "mission/update", missionId: mission.id, patch: deadlineChanged ? { ...patch, deadline } : patch, now: Date.now() };
      dispatch(action);
    }
    setEditing(false);
  }, [mission, title, priority, deadline, dispatch]);

  const openSprint = useCallback((s: Sprint) => {
    setSprintTitle(s.title);
    setSprintMinutes(s.durationMin);
    setSprintSheet(s);
  }, []);

  const saveSprint = useCallback(() => {
    if (!sprintSheet) return;
    dispatch({ type: "sprint/update", sprintId: sprintSheet.id, patch: { title: sprintTitle.trim() || sprintSheet.title, durationMin: sprintMinutes }, now: Date.now() });
    setSprintSheet(undefined);
  }, [sprintSheet, sprintTitle, sprintMinutes, dispatch]);

  const addSprint = useCallback(() => {
    if (!mission || !sprintTitle.trim()) return;
    dispatch({ type: "sprint/add", missionId: mission.id, title: sprintTitle.trim(), durationMin: sprintMinutes, now: Date.now() });
    setAdding(false);
    setSprintTitle("");
  }, [mission, sprintTitle, sprintMinutes, dispatch]);

  if (!mission || !progress) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="arrow-left" size={22} />
        </Pressable>
        <Text variant="heading" style={{ marginTop: space.xl }}>
          This mission isn't here any more.
        </Text>
        <Text tone="muted" style={{ marginTop: space.sm }}>
          It may have been deleted. Your other missions are safe.
        </Text>
      </Screen>
    );
  }

  const tint = categoryColor[mission.category] ?? colors.accent;
  const palette = mission.visual?.palette ?? paletteFor(mission.category, mission.title);
  const paused = mission.status === "paused";
  const done = mission.status === "completed";
  const sprintActionsFor = (s: Sprint) => (
    <View style={{ gap: 10 }}>
      <Text variant="caption" tone="muted">
        Sprint actions never remove progress you've made.
      </Text>
      {s.status !== "completed" ? <Button label="Start now" full onPress={() => { setSprintSheet(undefined); startSprint(s.id); }} icon={<Icon name="play" size={14} color={colors.accentText} />} /> : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {s.status === "planned" ? <Button label="Move to tomorrow" size="sm" variant="secondary" onPress={() => { dispatch({ type: "sprint/reschedule", sprintId: s.id, day: addDays(toDay(Date.now()), 1), now: Date.now() }); setSprintSheet(undefined); }} /> : null}
        {s.status === "planned" && s.durationMin >= 20 ? <Button label="Split in two" size="sm" variant="secondary" onPress={() => { dispatch({ type: "sprint/split", sprintId: s.id, now: Date.now() }); setSprintSheet(undefined); }} testID="sprint-split" /> : null}
        {s.status === "planned" ? <Button label="Skip" size="sm" variant="secondary" onPress={() => { dispatch({ type: "sprint/skip", sprintId: s.id, now: Date.now() }); setSprintSheet(undefined); }} testID="sprint-skip" /> : null}
        {s.status === "skipped" ? <Button label="Put back" size="sm" variant="secondary" onPress={() => { dispatch({ type: "sprint/reschedule", sprintId: s.id, day: toDay(Date.now()), now: Date.now() }); setSprintSheet(undefined); }} /> : null}
        {s.status !== "active" ? <Button label="Delete" size="sm" variant="danger" onPress={() => { dispatch({ type: "sprint/delete", sprintId: s.id }); setSprintSheet(undefined); }} /> : null}
      </View>
    </View>
  );

  return (
    <Screen maxWidth={isDesktop ? 820 : 680} testID="mission" padded>
      <View style={styles.topRow}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/missions"))} style={styles.back} accessibilityRole="button" accessibilityLabel="Back" testID="mission-back">
          <Icon name="arrow-left" size={22} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={openEdit} style={styles.back} accessibilityRole="button" accessibilityLabel="Edit mission" testID="mission-edit">
          <Icon name="edit" size={20} />
        </Pressable>
      </View>

      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={[styles.band, { backgroundColor: palette[0] }]}>
          <View style={[styles.bandInner, { backgroundColor: palette[1] }]} />
        </View>
        <View style={styles.heroBody}>
          <Ring size={88} progress={progress.ratio} color={paused ? colors.textFaint : tint} complete={done} stroke={6}>
            {done ? <Icon name="check" size={28} color={colors.success} /> : <Text variant="subheading">{Math.round(progress.ratio * 100)}%</Text>}
          </Ring>
          <View style={{ flex: 1, marginLeft: space.lg }}>
            <Text variant="label" tone="muted">
              {paused ? "Paused" : done ? "Complete" : mission.priority === 1 ? "Top priority" : "Mission"}
            </Text>
            <Text variant="title" style={{ marginTop: 4 }} testID="mission-title">
              {mission.title}
            </Text>
            <Text variant="small" tone="muted" style={{ marginTop: 4 }} numberOfLines={2}>
              {mission.objective}
            </Text>
          </View>
        </View>
        <View style={[styles.metaRow, { borderTopColor: colors.line }]}>
          <Meta label="Deadline" value={mission.deadline !== undefined ? formatDeadline(mission.deadline, Date.now()) : "Open"} />
          <Meta label="Sprints" value={`${progress.completed}/${progress.total}`} />
          <Meta label="Remaining" value={formatMinutes(progress.remainingMinutes)} />
        </View>
        <Text variant="small" tone="muted" style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          {HEALTH_COPY[health]}
          {rec?.best && rec.best.mission.id === mission.id && !done && !paused ? ` ${rec.best.reason}` : ""}
        </Text>
      </View>

      {mission.explanation ? (
        <View style={[styles.explain, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Icon name="sparkle" size={16} color={colors.accent} />
          <Text variant="small" style={{ marginLeft: 10, flex: 1 }}>
            {mission.explanation}
          </Text>
        </View>
      ) : null}

      {next && !paused && !done ? (
        <View style={{ marginTop: space.xl }}>
          <Button label={`Start next: ${next.title}`} size="xl" full onPress={() => startSprint(next.id)} icon={<Icon name="play" size={16} color={colors.accentText} />} testID="mission-start-next" />
          <Text variant="caption" tone="faint" align="center" style={{ marginTop: 8 }}>
            {next.durationMin} minutes
          </Text>
        </View>
      ) : paused ? (
        <View style={{ marginTop: space.xl }}>
          <Button label="Resume mission" size="lg" full onPress={() => dispatch({ type: "mission/resume", missionId: mission.id, now: Date.now() })} testID="mission-resume" />
        </View>
      ) : null}

      <SectionHeader title="Milestones" action={expandedAll ? "Collapse" : "Show all"} onAction={() => setExpandedAll((v) => !v)} />
      {milestones.map((ms, i) => {
        const sprints = milestoneSprints(state, ms.id);
        const doneCount = sprints.filter((s) => s.status === "completed").length;
        const isCurrent = ms.status === "active";
        const show = expandedAll || isCurrent;
        return (
          <View key={ms.id} style={[styles.milestone, { borderColor: colors.line }]} testID={`mission-milestone-${i}`}>
            <View style={styles.milestoneHead}>
              <Ring size={30} progress={sprints.length === 0 ? 0 : doneCount / sprints.length} color={tint} complete={ms.status === "completed"} stroke={3}>
                {ms.status === "completed" ? <Icon name="check" size={14} color={colors.success} /> : <Text variant="caption" tone="muted">{i + 1}</Text>}
              </Ring>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="subheading" tone={ms.status === "completed" ? "muted" : "default"}>
                  {ms.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {doneCount}/{sprints.length} sprints{isCurrent ? " · current" : ""}
                </Text>
              </View>
            </View>
            {show
              ? sprints.map((s) => {
                  const isNext = next?.id === s.id;
                  return (
                    <Pressable key={s.id} onPress={() => openSprint(s)} style={[styles.sprint, isNext ? { backgroundColor: colors.accentSoft, borderRadius: radius.md } : null]} scaleTo={0.995} accessibilityRole="button" accessibilityLabel={`${s.title}, ${s.durationMin} minutes, ${s.status}`} testID={`sprint-${s.id}`}>
                      <View style={[styles.mark, { borderColor: s.status === "completed" ? colors.success : isNext ? colors.accent : colors.lineStrong, backgroundColor: s.status === "completed" ? colors.success : "transparent" }]}>
                        {s.status === "completed" ? <Icon name="check" size={10} color={colors.bg} strokeWidth={3} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant={isNext ? "bodyStrong" : "body"} tone={s.status === "completed" || s.status === "skipped" ? "muted" : "default"} style={s.status === "skipped" ? { textDecorationLine: "line-through" } : null} numberOfLines={2}>
                          {s.title}
                        </Text>
                        {isNext ? (
                          <Text variant="caption" tone="accent">
                            Next
                          </Text>
                        ) : s.scheduledFor && s.status === "planned" ? (
                          <Text variant="caption" tone="faint">
                            {s.scheduledFor === toDay(Date.now()) ? "Today" : s.scheduledFor === addDays(toDay(Date.now()), 1) ? "Tomorrow" : s.scheduledFor}
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="small" tone="muted" style={{ marginLeft: 8 }}>
                        {s.actualMinutes ?? s.durationMin} min
                      </Text>
                    </Pressable>
                  );
                })
              : null}
          </View>
        );
      })}

      <View style={{ marginTop: space.lg, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button label="Add a sprint" variant="secondary" size="sm" onPress={() => { setSprintTitle(""); setSprintMinutes(state.preferences.defaultSprintMin); setAdding(true); }} icon={<Icon name="plus" size={14} />} testID="mission-add-sprint" />
        {!done ? <Button label={paused ? "Resume" : "Pause mission"} variant="secondary" size="sm" onPress={() => dispatch({ type: paused ? "mission/resume" : "mission/pause", missionId: mission.id, now: Date.now() })} testID="mission-pause" /> : null}
        <Button label="Archive" variant="secondary" size="sm" onPress={() => setConfirm("archive")} testID="mission-archive" />
        <Button label="Delete" variant="danger" size="sm" onPress={() => setConfirm("delete")} testID="mission-delete" />
      </View>

      {mission.reflection?.helped ? (
        <View style={[styles.explain, { backgroundColor: colors.surface, borderColor: colors.line, marginTop: space.xl }]}>
          <Text variant="small" tone="muted">
            What helped: <Text variant="small">{mission.reflection.helped}</Text>
          </Text>
        </View>
      ) : null}

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Edit mission" testID="edit-mission">
        <Text variant="label" tone="muted">
          Title
        </Text>
        <TextInput value={title} onChangeText={setTitle} style={[styles.input, { color: colors.text, borderColor: colors.line }]} accessibilityLabel="Mission title" testID="edit-title" />
        <Text variant="label" tone="muted" style={{ marginTop: space.lg }}>
          Priority
        </Text>
        <View style={styles.chips}>
          {[1, 2, 3].map((p) => (
            <Chip key={p} label={p === 1 ? "Top" : p === 2 ? "Normal" : "Later"} size="sm" selected={priority === p} onPress={() => setPriority(p as 1 | 2 | 3)} />
          ))}
        </View>
        <Text variant="label" tone="muted" style={{ marginTop: space.lg }}>
          Deadline
        </Text>
        <View style={styles.chips}>
          <Chip label="No deadline" size="sm" selected={deadline === undefined} onPress={() => { setDeadline(undefined); setShowCalendar(false); }} />
          <Chip label={deadline !== undefined ? formatDeadline(deadline, Date.now()) : "Pick a date"} size="sm" selected={deadline !== undefined} onPress={() => setShowCalendar((v) => !v)} testID="edit-deadline" />
        </View>
        {showCalendar ? (
          <View style={{ marginTop: space.md }}>
            <CalendarPicker value={deadline} onChange={(d) => { setDeadline(d); setShowCalendar(false); }} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: space.xl, gap: 10 }}>
          <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
          <Button label="Save" onPress={saveEdit} testID="edit-save" />
        </View>
      </Sheet>

      <Sheet visible={!!sprintSheet} onClose={() => setSprintSheet(undefined)} title={sprintSheet?.status === "completed" ? "Completed sprint" : "Sprint"} testID="sprint-sheet">
        {sprintSheet ? (
          <>
            <TextInput value={sprintTitle} onChangeText={setSprintTitle} style={[styles.input, { color: colors.text, borderColor: colors.line }]} accessibilityLabel="Sprint title" editable={sprintSheet.status !== "completed"} />
            {sprintSheet.status !== "completed" ? (
              <>
                <Text variant="label" tone="muted" style={{ marginTop: space.lg }}>
                  Length
                </Text>
                <View style={styles.chips}>
                  {[5, 10, 15, 25, 45, 60, 90].map((m) => (
                    <Chip key={m} label={`${m}`} size="sm" selected={sprintMinutes === m} onPress={() => setSprintMinutes(m)} />
                  ))}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", marginVertical: space.lg }}>
                  <Button label="Save changes" size="sm" onPress={saveSprint} testID="sprint-save" />
                </View>
              </>
            ) : (
              <Text variant="small" tone="muted" style={{ marginVertical: space.lg }}>
                Done{sprintSheet.actualMinutes ? ` in ${sprintSheet.actualMinutes} minutes` : ""}. Nice.
              </Text>
            )}
            {sprintActionsFor(sprintSheet)}
          </>
        ) : null}
      </Sheet>

      <Sheet visible={adding} onClose={() => setAdding(false)} title="Add a sprint" testID="add-sprint">
        <TextInput value={sprintTitle} onChangeText={setSprintTitle} placeholder="What's the next concrete step?" placeholderTextColor={colors.textFaint} style={[styles.input, { color: colors.text, borderColor: colors.line }]} accessibilityLabel="Sprint title" autoFocus testID="add-sprint-title" />
        <Text variant="label" tone="muted" style={{ marginTop: space.lg }}>
          Length
        </Text>
        <View style={styles.chips}>
          {[5, 10, 15, 25, 45, 60, 90].map((m) => (
            <Chip key={m} label={`${m}`} size="sm" selected={sprintMinutes === m} onPress={() => setSprintMinutes(m)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: space.xl, gap: 10 }}>
          <Button label="Cancel" variant="secondary" onPress={() => setAdding(false)} />
          <Button label="Add" onPress={addSprint} disabled={!sprintTitle.trim()} testID="add-sprint-save" />
        </View>
      </Sheet>

      <Confirm
        visible={confirm === "archive"}
        title="Archive this mission?"
        body="It leaves your active list but everything you did is kept in your history."
        confirmLabel="Archive"
        cancelLabel="Keep it"
        onConfirm={() => { setConfirm(undefined); dispatch({ type: "mission/archive", missionId: mission.id, now: Date.now() }); router.dismissTo("/missions"); }}
        onCancel={() => setConfirm(undefined)}
      />
      <Confirm
        visible={confirm === "delete"}
        title="Delete this mission?"
        body="This removes the mission and its sprints permanently. Completed focus time stays in your totals."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => { setConfirm(undefined); dispatch({ type: "mission/delete", missionId: mission.id }); router.dismissTo("/missions"); }}
        onCancel={() => setConfirm(undefined)}
      />
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="label" tone="faint">
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -10 },
  hero: { marginTop: space.lg, borderWidth: 1, borderRadius: radius.xl, overflow: "hidden" },
  band: { height: 10, flexDirection: "row" },
  bandInner: { width: "38%", height: 10 },
  heroBody: { flexDirection: "row", alignItems: "center", padding: space.lg },
  metaRow: { flexDirection: "row", paddingHorizontal: space.lg, paddingVertical: space.lg, borderTopWidth: 1 },
  explain: { marginTop: space.lg, flexDirection: "row", alignItems: "flex-start", padding: 14, borderRadius: radius.md, borderWidth: 1 },
  milestone: { borderTopWidth: 1, paddingVertical: 12 },
  milestoneHead: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  sprint: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 10, marginLeft: 32, minHeight: 48 },
  mark: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, marginRight: 12, alignItems: "center", justifyContent: "center" },
  input: { marginTop: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: fonts.sans, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.sm },
});
