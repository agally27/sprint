import type { Achievement, ActivityEvent, ActivityType, AppState, CompletionSummary, Goal, ID, Millis, Milestone, Mission, PlanAdjustment, Sprint, SprintSession } from "../domain/types";
import { newId } from "../domain/ids";
import { toDay } from "../domain/time";
import { activeSession, completedSprints, milestoneSprints, missionMilestones, missionProgress, missionSprints } from "../domain/selectors";
import { materializePlan } from "../planning/planner";
import { timer, type TimerState } from "../timer";
import { addCompletion, evaluateAchievements, settle } from "../momentum/momentum";
import { applyDeadlineChange, catchUp, reduceToday, splitSprint } from "../adapt/engine";
import { buildDailyMission } from "../next/engine";
import { completionLine } from "../coach/engine";
import { createInitialState } from "./initial";
import type { Action } from "./actions";

const MAX_EVENTS = 2000;

export function sessionTimer(session: SprintSession): TimerState {
  const t: TimerState = {
    durationMs: session.durationMs,
    startedAt: session.startedAt,
    pauses: session.pauses,
    highWater: session.lastSeenAt,
  };
  if (session.endedAt !== undefined) t.completedAt = session.endedAt;
  return t;
}

function fromTimer(session: SprintSession, t: TimerState): SprintSession {
  const next: SprintSession = { ...session, durationMs: t.durationMs, pauses: t.pauses, lastSeenAt: t.highWater };
  if (t.completedAt !== undefined) next.endedAt = t.completedAt;
  return next;
}

function event(state: AppState, type: ActivityType, at: Millis, extra: Partial<ActivityEvent> = {}): AppState {
  const e: ActivityEvent = { id: newId("evt"), type, at, ...extra };
  const events = state.events.length >= MAX_EVENTS ? [...state.events.slice(-MAX_EVENTS + 1), e] : [...state.events, e];
  return { ...state, events };
}

function putSprints(state: AppState, sprints: Sprint[]): AppState {
  const next = { ...state.sprints };
  for (const s of sprints) next[s.id] = s;
  return { ...state, sprints: next };
}

function touchMission(state: AppState, missionId: ID, now: Millis, patch: Partial<Mission> = {}): AppState {
  const m = state.missions[missionId];
  if (!m) return state;
  return { ...state, missions: { ...state.missions, [missionId]: { ...m, ...patch, updatedAt: now } } };
}

/** Milestones complete when every sprint in them is done or skipped; missions likewise. */
function settleStructure(state: AppState, missionId: ID, now: Millis): { state: AppState; milestoneCompleted?: Milestone; missionCompleted: boolean } {
  let next = state;
  let milestoneCompleted: Milestone | undefined;
  const milestones = missionMilestones(next, missionId);
  let activeSet = false;
  for (const ms of milestones) {
    const sprints = milestoneSprints(next, ms.id);
    const done = sprints.length > 0 && sprints.every((s) => s.status === "completed" || s.status === "skipped");
    if (done && ms.status !== "completed") {
      const completed: Milestone = { ...ms, status: "completed", completedAt: now };
      next = { ...next, milestones: { ...next.milestones, [ms.id]: completed } };
      if (sprints.some((s) => s.status === "completed")) milestoneCompleted = completed;
      next = event(next, "milestone_completed", now, { missionId });
    } else if (!done) {
      const status = activeSet ? "pending" : "active";
      activeSet = true;
      if (ms.status !== status) next = { ...next, milestones: { ...next.milestones, [ms.id]: { ...ms, status } } };
    }
  }
  const all = missionSprints(next, missionId);
  const missionDone = all.length > 0 && all.every((s) => s.status === "completed" || s.status === "skipped") && all.some((s) => s.status === "completed");
  const mission = next.missions[missionId];
  let missionCompleted = false;
  if (missionDone && mission && mission.status === "active") {
    next = touchMission(next, missionId, now, { status: "completed", completedAt: now });
    next = event(next, "mission_completed", now, { missionId });
    missionCompleted = true;
  }
  const r: { state: AppState; milestoneCompleted?: Milestone; missionCompleted: boolean } = { state: next, missionCompleted };
  if (milestoneCompleted) r.milestoneCompleted = milestoneCompleted;
  return r;
}

function finishSession(state: AppState, now: Millis): AppState {
  const session = activeSession(state);
  if (!session) return state;
  const sprint = state.sprints[session.sprintId];
  const t = timer.complete(sessionTimer(session), now);
  const reading = timer.derive(sessionTimer(session), now);
  const focusedMinutes = Math.max(1, Math.round(reading.elapsedMs / 60_000));
  const expired = reading.expired;
  const ended: SprintSession = { ...fromTimer(session, t), outcome: expired ? "expired" : "completed" };
  let next: AppState = { ...state, sessions: { ...state.sessions, [session.id]: ended } };
  delete (next as { activeSessionId?: ID }).activeSessionId;
  if (!sprint) return next;

  const completedSprint: Sprint = { ...sprint, status: "completed", completedAt: now, actualMinutes: focusedMinutes };
  next = putSprints(next, [completedSprint]);
  next = touchMission(next, sprint.missionId, now, { lastActivityAt: now });
  next = event(next, expired ? "sprint_expired" : "sprint_completed", now, { missionId: sprint.missionId, sprintId: sprint.id, minutes: focusedMinutes });

  const momentumBefore = settle(state.momentum, now).score;
  const { next: momentum, gain } = addCompletion(state.momentum, completedSprint, focusedMinutes, now);
  next = { ...next, momentum };

  const settled = settleStructure(next, sprint.missionId, now);
  next = settled.state;

  const unlocked: Achievement[] = evaluateAchievements({
    now,
    completedSprints: completedSprints(next),
    justCompleted: completedSprint,
    focusedMinutes,
    momentumScore: momentum.score,
    lifetimeFocusMinutes: momentum.focusMinutes,
    milestoneCompleted: !!settled.milestoneCompleted,
    missionCompleted: settled.missionCompleted,
    events: next.events,
    existing: next.achievements,
  });
  if (unlocked.length > 0) {
    next = { ...next, achievements: [...next.achievements, ...unlocked] };
    for (const a of unlocked) next = event(next, "achievement_unlocked", now, { note: a.key, missionId: sprint.missionId });
  }

  const progress = missionProgress(next, sprint.missionId);
  const summary: CompletionSummary = {
    sessionId: session.id,
    sprintId: sprint.id,
    missionId: sprint.missionId,
    at: now,
    focusedMinutes,
    expired,
    momentumBefore,
    momentumAfter: momentum.score,
    momentumGain: gain,
    achievements: unlocked.map((a) => a.key),
    missionCompleted: settled.missionCompleted,
    missionProgress: { completed: progress.completed, total: progress.total, ratio: progress.ratio },
    line: completionLine(completedSprints(next).length),
  };
  if (settled.milestoneCompleted) summary.milestoneCompleted = { id: settled.milestoneCompleted.id, title: settled.milestoneCompleted.title };
  return { ...next, lastCompletion: summary };
}

function withAdjustments(state: AppState, adjustments: PlanAdjustment[], now: Millis): AppState {
  if (adjustments.length === 0) return state;
  let next: AppState = { ...state, pendingAdjustments: [...state.pendingAdjustments, ...adjustments].slice(-5) };
  for (const a of adjustments) next = event(next, "plan_adjusted", now, { missionId: a.missionId, note: a.kind });
  return next;
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "mission/create": {
      const goal: Goal = { id: newId("goal"), text: action.goalText, source: action.source, createdAt: action.now };
      const opts: { priority?: 1 | 2 | 3 } = {};
      if (action.priority) opts.priority = action.priority;
      const { mission, milestones, sprints } = materializePlan(action.plan, goal.id, action.now, opts);
      let next: AppState = {
        ...state,
        onboarded: true,
        goals: { ...state.goals, [goal.id]: goal },
        missions: { ...state.missions, [mission.id]: { ...mission, lastActivityAt: action.now } },
        milestones: { ...state.milestones, ...Object.fromEntries(milestones.map((m) => [m.id, m])) },
      };
      next = putSprints(next, sprints);
      next = event(next, "goal_created", action.now, { missionId: mission.id });
      next = event(next, "mission_created", action.now, { missionId: mission.id });
      return next;
    }

    case "mission/update": {
      const mission = state.missions[action.missionId];
      if (!mission) return state;
      const { deadline, ...rest } = action.patch;
      let next = touchMission(state, action.missionId, action.now, rest);
      if ("deadline" in action.patch && deadline !== mission.deadline) {
        const r = applyDeadlineChange(next, next.missions[action.missionId]!, deadline, action.now);
        next = touchMission(next, action.missionId, action.now, deadline === undefined ? {} : { deadline, timeframe: "custom" });
        if (deadline === undefined) {
          const m = { ...next.missions[action.missionId]! };
          delete m.deadline;
          m.timeframe = "long_term";
          next = { ...next, missions: { ...next.missions, [m.id]: m } };
        }
        next = putSprints(next, r.sprints);
        if (r.adjustment) next = withAdjustments(next, [r.adjustment], action.now);
      }
      return next;
    }

    case "mission/pause":
      return event(touchMission(state, action.missionId, action.now, { status: "paused" }), "mission_paused", action.now, { missionId: action.missionId });

    case "mission/resume": {
      let next = touchMission(state, action.missionId, action.now, { status: "active", lastActivityAt: action.now });
      next = event(next, "mission_resumed", action.now, { missionId: action.missionId });
      const r = catchUp(next, action.now);
      next = putSprints(next, r.updates);
      return withAdjustments(next, r.adjustments, action.now);
    }

    case "mission/archive":
      return event(touchMission(state, action.missionId, action.now, { status: "archived" }), "mission_archived", action.now, { missionId: action.missionId });

    case "mission/delete": {
      const missions = { ...state.missions };
      delete missions[action.missionId];
      const milestones = Object.fromEntries(Object.entries(state.milestones).filter(([, m]) => m.missionId !== action.missionId));
      const sprints = Object.fromEntries(Object.entries(state.sprints).filter(([, s]) => s.missionId !== action.missionId));
      const sessions = Object.fromEntries(Object.entries(state.sessions).filter(([, s]) => s.missionId !== action.missionId));
      const next: AppState = { ...state, missions, milestones, sprints, sessions };
      if (next.activeSessionId && !sessions[next.activeSessionId]) delete next.activeSessionId;
      return next;
    }

    case "mission/complete": {
      let next = touchMission(state, action.missionId, action.now, { status: "completed", completedAt: action.now });
      const remaining = missionSprints(next, action.missionId).filter((s) => s.status === "planned");
      next = putSprints(
        next,
        remaining.map((s) => ({ ...s, status: "skipped" as const })),
      );
      return event(next, "mission_completed", action.now, { missionId: action.missionId });
    }

    case "mission/reflect":
      return event(touchMission(state, action.missionId, action.now, { reflection: { ...action.reflection, createdAt: action.now } }), "reflection_added", action.now, { missionId: action.missionId });

    case "mission/setVisual":
      return touchMission(state, action.missionId, state.missions[action.missionId]?.updatedAt ?? 0, { visual: action.visual });

    case "sprint/start": {
      const sprint = state.sprints[action.sprintId];
      if (!sprint || sprint.status === "completed") return state;
      // Only one sprint at a time: cancel any other active session first.
      let next = state.activeSessionId ? reduce(state, { type: "sprint/cancel", now: action.now }) : state;
      const minutes = action.minutes ?? sprint.durationMin;
      const session: SprintSession = {
        id: newId("ses"),
        sprintId: sprint.id,
        missionId: sprint.missionId,
        durationMs: minutes * 60_000,
        startedAt: action.now,
        pauses: [],
        lastSeenAt: action.now,
      };
      next = { ...next, sessions: { ...next.sessions, [session.id]: session }, activeSessionId: session.id };
      next = putSprints(next, [{ ...sprint, status: "active", durationMin: minutes }]);
      next = touchMission(next, sprint.missionId, action.now, { lastActivityAt: action.now, status: "active" });
      delete next.lastCompletion;
      return event(next, "sprint_started", action.now, { missionId: sprint.missionId, sprintId: sprint.id, minutes });
    }

    case "sprint/pause": {
      const session = activeSession(state);
      if (!session) return state;
      const t = timer.pause(sessionTimer(session), action.now);
      if (t.completedAt !== undefined) return finishSession(state, action.now);
      const next: AppState = { ...state, sessions: { ...state.sessions, [session.id]: fromTimer(session, t) } };
      return event(next, "sprint_paused", action.now, { missionId: session.missionId, sprintId: session.sprintId });
    }

    case "sprint/resume": {
      const session = activeSession(state);
      if (!session) return state;
      const t = timer.resume(sessionTimer(session), action.now);
      const next: AppState = { ...state, sessions: { ...state.sessions, [session.id]: fromTimer(session, t) } };
      return event(next, "sprint_resumed", action.now, { missionId: session.missionId, sprintId: session.sprintId });
    }

    case "sprint/extend": {
      const session = activeSession(state);
      if (!session) return state;
      const t = timer.extend(sessionTimer(session), action.deltaMin * 60_000, action.now);
      const sprint = state.sprints[session.sprintId];
      let next: AppState = { ...state, sessions: { ...state.sessions, [session.id]: fromTimer(session, t) } };
      if (sprint) next = putSprints(next, [{ ...sprint, durationMin: Math.round(t.durationMs / 60_000) }]);
      return next;
    }

    case "sprint/complete":
      return finishSession(state, action.now);

    case "sprint/cancel": {
      const session = activeSession(state);
      if (!session) return state;
      const t = timer.complete(sessionTimer(session), action.now);
      const ended: SprintSession = { ...fromTimer(session, t), outcome: "cancelled" };
      let next: AppState = { ...state, sessions: { ...state.sessions, [session.id]: ended } };
      delete next.activeSessionId;
      const sprint = state.sprints[session.sprintId];
      if (sprint && sprint.status === "active") next = putSprints(next, [{ ...sprint, status: "planned" }]);
      return event(next, "sprint_cancelled", action.now, { missionId: session.missionId, sprintId: session.sprintId });
    }

    case "sprint/skip": {
      const sprint = state.sprints[action.sprintId];
      if (!sprint || sprint.status === "completed") return state;
      let next = putSprints(state, [{ ...sprint, status: "skipped" }]);
      next = event(next, "sprint_skipped", action.now, { missionId: sprint.missionId, sprintId: sprint.id });
      return settleStructure(next, sprint.missionId, action.now).state;
    }

    case "sprint/reschedule": {
      const sprint = state.sprints[action.sprintId];
      if (!sprint) return state;
      return event(putSprints(state, [{ ...sprint, scheduledFor: action.day, status: sprint.status === "skipped" ? "planned" : sprint.status }]), "sprint_rescheduled", action.now, {
        missionId: sprint.missionId,
        sprintId: sprint.id,
      });
    }

    case "sprint/update": {
      const sprint = state.sprints[action.sprintId];
      if (!sprint) return state;
      const patch: Partial<Sprint> = { ...action.patch };
      if (patch.durationMin !== undefined) patch.durationMin = Math.max(1, Math.min(180, Math.round(patch.durationMin)));
      return touchMission(putSprints(state, [{ ...sprint, ...patch }]), sprint.missionId, action.now);
    }

    case "sprint/add": {
      const mission = state.missions[action.missionId];
      if (!mission) return state;
      const all = missionSprints(state, action.missionId);
      const after = action.afterSprintId ? state.sprints[action.afterSprintId] : all.at(-1);
      const milestoneId =
        action.milestoneId ?? after?.milestoneId ?? missionMilestones(state, action.missionId).find((m) => m.status !== "completed")?.id ?? missionMilestones(state, action.missionId).at(-1)?.id;
      if (!milestoneId) return state;
      const order = after ? after.order + 0.5 : all.length;
      const sprint: Sprint = {
        id: newId("spr"),
        missionId: action.missionId,
        milestoneId,
        title: action.title,
        durationMin: Math.max(1, Math.min(180, Math.round(action.durationMin))),
        order,
        status: "planned",
        energy: action.energy ?? (action.durationMin >= 45 ? "deep" : action.durationMin >= 15 ? "focused" : "light"),
        scheduledFor: after?.scheduledFor ?? toDay(action.now),
      };
      let next = putSprints(state, [sprint]);
      // Re-pack orders to integers.
      const packed = missionSprints(next, action.missionId).map((s, i) => ({ ...s, order: i }));
      next = putSprints(next, packed);
      const ms = next.milestones[milestoneId];
      if (ms && ms.status === "completed") next = { ...next, milestones: { ...next.milestones, [ms.id]: { ...ms, status: "active" } } };
      if (mission.status === "completed") next = touchMission(next, mission.id, action.now, { status: "active" });
      return settleStructure(touchMission(next, action.missionId, action.now), action.missionId, action.now).state;
    }

    case "sprint/delete": {
      const sprint = state.sprints[action.sprintId];
      if (!sprint || sprint.status === "active") return state;
      const sprints = { ...state.sprints };
      delete sprints[action.sprintId];
      return { ...state, sprints };
    }

    case "sprint/split": {
      const sprint = state.sprints[action.sprintId];
      if (!sprint || sprint.status !== "planned") return state;
      const [a, b] = splitSprint(sprint, action.now, action.firstMinutes);
      const sprints = { ...state.sprints };
      delete sprints[sprint.id];
      let next: AppState = { ...state, sprints };
      next = putSprints(next, [a, b]);
      const packed = missionSprints(next, sprint.missionId).map((s, i) => ({ ...s, order: i }));
      next = putSprints(next, packed);
      next = event(next, "sprint_split", action.now, { missionId: sprint.missionId, sprintId: sprint.id });
      return withAdjustments(
        next,
        [{ id: newId("adj"), kind: "split", missionId: sprint.missionId, at: action.now, message: `"${sprint.title}" was bigger than expected. I've split it into two smaller sprints.` }],
        action.now,
      );
    }

    case "sprint/followUp": {
      const sprint = state.sprints[action.sprintId];
      if (!sprint) return state;
      return reduce(state, {
        type: "sprint/add",
        missionId: sprint.missionId,
        milestoneId: sprint.milestoneId,
        title: sprint.title.replace(/ \(part \d\)$/, "") + " (continued)",
        durationMin: action.minutes,
        energy: sprint.energy,
        afterSprintId: sprint.id,
        now: action.now,
      });
    }

    case "plan/catchUp": {
      const r = catchUp(state, action.now);
      return withAdjustments(putSprints(state, r.updates), r.adjustments, action.now);
    }

    case "plan/reduceToday": {
      const r = reduceToday(state, action.missionId, action.keepMinutes, action.now);
      return withAdjustments(putSprints(state, r.sprints), r.adjustment ? [r.adjustment] : [], action.now);
    }

    case "plan/dismissAdjustment":
      return { ...state, pendingAdjustments: state.pendingAdjustments.filter((a) => a.id !== action.id) };

    case "prefs/set":
      return { ...state, preferences: { ...state.preferences, ...action.patch } };

    case "permissions/set":
      return { ...state, permissions: { ...state.permissions, [action.key]: action.state } };

    case "onboarding/complete":
      return { ...state, onboarded: true };

    case "daily/build": {
      const day = toDay(action.now);
      if (state.dailyMission?.day === day) return state;
      return { ...state, dailyMission: { day, sprintIds: buildDailyMission(state, action.now) } };
    }

    case "app/foreground": {
      let next: AppState = { ...state, momentum: settle(state.momentum, action.now) };
      const session = activeSession(next);
      if (session) {
        const t = timer.observe(sessionTimer(session), action.now);
        next = { ...next, sessions: { ...next.sessions, [session.id]: fromTimer(session, t) } };
      } else {
        next = reduce(next, { type: "plan/catchUp", now: action.now });
      }
      return reduce(next, { type: "daily/build", now: action.now });
    }

    case "completion/clear": {
      const next = { ...state };
      delete next.lastCompletion;
      return next;
    }

    case "data/reset":
      return { ...createInitialState(action.now), preferences: state.preferences, permissions: state.permissions };

    case "data/replace":
      return action.state;

    default:
      return state;
  }
}
