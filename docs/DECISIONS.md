# Decisions

Short records of the choices that shape Sprint. Newest last.

### 1. Expo universal app, not web-first
iOS, Android and web share one codebase with native microphone, notifications, haptics, background behaviour and store deployment. The desktop web layout is designed, not inherited: a left rail and a two-column home.

### 2. A pure TypeScript core
Planner, timer, rewards, next-action and adaptation live in `packages/core` with no platform imports. They are tested as functions of `(state, now)`, including eight end-to-end journeys that run in milliseconds. The app is a thin, replaceable shell.

### 3. Timestamps, not ticks
The timer stores when it started and when it paused. The UI derives the remaining time whenever it likes. Backgrounding, device sleep, reload and clock changes all reduce to the same arithmetic. A high-water mark defends against a clock moving backwards.

### 4. One reducer and a JSON snapshot
A normalised `AppState` persisted as one document is simpler than a database at this scale, trivially offline, easy to migrate and easy to sync later (ids and `updatedAt` on everything, an event log alongside).

### 5. Local planner first, model second
Playbooks per goal archetype produce honest, concrete plans with zero latency and zero keys. The model is an upgrade path behind the same `PlanDraft` shape, validated with a schema, and always falls back.

### 6. Momentum instead of streaks
A score that cools with a four-day half-life rewards real progress and forgives absence. There is no daily chain to protect, so there is no reason to open the app without working.

### 7. Time's up means done
A sprint is a time box. When the timer runs out, the sprint is complete and the time counts. If the work isn't finished, a one-tap follow-up sprint joins the plan. Nobody is told they failed.

### 8. The countdown doesn't eat the sprint
Focus mode receives the sprint id and starts the timer only after 3-2-1-Go.

### 9. Hono for the API
Tiny, runs on Node, Vercel and edge runtimes, trivially testable with `app.request()`. The API holds keys and nothing else.

### 10. Sounds are generated, not licensed
Four short tones are synthesised into WAV files in the repo so sound works with no assets pipeline. A music provider interface exists for real audio later.

### 11. Modal exits use `dismissTo`
Replacing or navigating from a modal stacked a second tab screen on web. `dismissTo` returns to the existing one.
