# Architecture

## Shape

```
┌──────────────────────── apps/app (Expo) ────────────────────────┐
│ screens (Expo Router) ─ components ─ theme ─ hooks               │
│ store/      zustand wrapper over the pure reducer + persistence  │
│ platform/   haptics · notifications(.native/.web) · voice · tts  │
│             audio · storage                                       │
└──────────────┬───────────────────────────────────────────────────┘
               │ imports
┌──────────────▼──────── packages/core (pure TS) ──────────────────┐
│ domain      types · time · selectors · ids                       │
│ planning    parseGoal (NL deadlines) · templates · planner        │
│ timer       timestamp engine (start/pause/resume/derive)          │
│ momentum    score · cooling · levels · achievements               │
│ next        recommendNext · daily mission                         │
│ adapt       catch-up · split · deadline change · reduce today     │
│ coach       interventions · greeting · copy                       │
│ review      weekly review · stats                                 │
│ voice       intents · permission state machine                    │
│ notifications  planner · quiet hours · sync by key                │
│ providers   AI · voice · speech · audio · music · image · haptics │
│             calendar · storage (interfaces + mocks)               │
│ state       actions · reducer · persistence/migration · initial   │
└──────────────┬───────────────────────────────────────────────────┘
               │ imports (planner, types, parseGoal)
┌──────────────▼──────── apps/server (Hono) ───────────────────────┐
│ /api/plan · /api/reflect · /api/tts · /api/image · /api/health   │
│ providers: Anthropic | Local · ElevenLabs | none · mock image     │
└──────────────────────────────────────────────────────────────────┘
```

## Principles

1. **The core is pure.** No React, no platform APIs, no network. Every engine is a function of `(state, now)`. That is why the timer, the planner, rescheduling and rewards have fast unit tests and journey tests that run in milliseconds.
2. **One reducer, one snapshot.** `AppState` is a plain JSON document with normalised maps for goals, missions, milestones, sprints and sessions. The app's zustand store wraps `reduce(state, action)` and persists the snapshot (debounced) through a `StorageAdapter`. Startup loads, migrates and reconciles (`app/foreground`).
3. **Time is data.** The active sprint session stores `startedAt`, `pauses[]`, `durationMs` and `lastSeenAt`. Remaining time is always *derived* from timestamps, never counted. Backgrounding, suspension, reload and clock jumps are handled by the same code path (`timer.derive`). A high-water mark stops a backwards clock from rewinding a sprint.
4. **Offline first.** Nothing in the core loop touches the network. The API only improves plans and adds voice synthesis; both fall back locally.
5. **Providers behind interfaces.** AI, voice (STT), speech (TTS), audio, music, image, haptics, calendar, notifications and storage are interfaces in core with mock implementations, concrete implementations in `apps/app/platform`, and a registry in `store/providers.ts`. Swapping ElevenLabs for another TTS or Anthropic for another model never touches a screen.

## Data model

```
Goal ──1:1── Mission ──1:n── Milestone ──1:n── Sprint ──1:n── SprintSession
                 │                                   
                 └─ visual (palette or image), reflection, deadline, priority

MomentumState · Achievement[] · Preferences · Permissions · ActivityEvent[] · DailyMission · PlanAdjustment[] · CompletionSummary
```

`Sprint.status`: planned → active → completed | skipped. Milestones complete when every sprint is done or skipped; missions when every milestone is. All derived, re-evaluated on each completion.

## Navigation

Expo Router. `(main)` holds three tabs (Today, Missions, Progress) with a bottom bar on phones and a left rail on desktop. Focus and Complete are full-screen modals; New goal, What next and Review are sheets. Modal exits use `dismissTo` so the tab screen is never duplicated.

## Notifications

`planNotifications(state, now, timer)` lists everything that *should* be scheduled (sprint end, morning suggestion, deadline, quiet mission) keyed by stable ids; `syncNotifications` diffs against what *is* scheduled. Quiet hours apply to everything except the sprint-end notification the user asked for by starting a sprint. Native uses `expo-notifications`; web uses the Notification API while a tab is open.

## Sync (future)

Every entity has an id and `updatedAt`; events are appended in `ActivityEvent[]`. A sync layer can upload the snapshot or the event log once accounts exist, without changing the reducer.
