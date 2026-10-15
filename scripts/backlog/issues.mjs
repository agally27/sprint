// The proposed backlog, derived from docs/ROADMAP.md, the deployment checklist
// and the repository audit. `create-issues.mjs` turns this into labels and
// GitHub issues. Edit here, review, then apply.
//
// Shape: one issue per pull request of agent work. Issues an agent can take
// without owner input get `enhancement` (plus `roadmap` when they come from
// the roadmap). Issues that need a decision first carry `needs-decision`.
// Nothing here carries `agent:ready`; a human adds that label deliberately.

export const labels = [
  { name: "agent:ready", color: "0E8A16", description: "Queued for the Agent workflow" },
  { name: "agent:working", color: "FBCA04", description: "An agent run is in progress" },
  { name: "agent:pr-open", color: "1D76DB", description: "The agent opened a pull request; review it" },
  { name: "agent:needs-human", color: "D93F0B", description: "The agent stopped with a question or a failure; read the latest comment" },
  { name: "roadmap", color: "C5DEF5", description: "From docs/ROADMAP.md" },
  { name: "needs-decision", color: "5319E7", description: "Owner decisions required before an agent can take it" },
  { name: "human", color: "BFDADC", description: "Manual work outside the repository" },
];

export const issues = [
  {
    title: "Add ESLint and run it inside pnpm verify",
    labels: ["enhancement"],
    body: `## Context
The repository has strict TypeScript, Prettier, unit tests and Playwright journeys, but no linter. A linter catches unused code, missing hook dependencies and accidental platform imports inside \`packages/core\` before review, which matters when several agents open pull requests unattended.

## Scope
In: an ESLint flat config at the root covering \`apps/app\`, \`apps/server\` and \`packages/core\`; a root \`pnpm lint\` script; \`pnpm verify\` runs it after \`pnpm format:check\`; existing findings fixed.
Out: stylistic rules Prettier already owns; new CI jobs; changes to CLAUDE.md (the maintainer updates its command table).

## Acceptance criteria
- [ ] \`pnpm lint\` exists at the root and passes.
- [ ] \`pnpm verify\` runs \`pnpm lint\` right after \`pnpm format:check\`; CI is otherwise unchanged and green.
- [ ] typescript-eslint recommended rules everywhere, react-hooks rules for \`apps/app\`, and a \`no-restricted-imports\` rule that forbids \`react\`, \`react-native\` and \`expo*\` imports inside \`packages/core\`.
- [ ] Existing findings are fixed in code, not silenced. Every rule turned off has a one-line reason in the config. No \`eslint-disable\` comment without a reason.
- [ ] \`docs/SETUP.md\` lists the command.

## Verification
\`pnpm verify\`. Locally, add \`import { View } from "react-native"\` to a core file, confirm \`pnpm lint\` fails, remove it.

## Decisions already made
You may add these root devDependencies at their current stable versions and nothing else: \`eslint\`, \`typescript-eslint\`, \`eslint-plugin-react-hooks\`. Use \`eslint-config-expo\` only if it works with the flat config without extra packages; otherwise leave it out.`,
  },
  {
    title: "Unit tests for the app store, config and providers (apps/app has none)",
    labels: ["enhancement"],
    body: `## Context
\`apps/app\` runs \`vitest run --passWithNoTests\` and has zero unit tests. The store, the public config and the provider registry are only exercised through Playwright, which is slow and indirect.

## Scope
In: a vitest setup for \`apps/app\` (the \`@/\` alias, \`vitest/globals\`, mocks for \`@/platform/*\` modules that import Expo or React Native); tests for \`src/store/store.ts\` (dispatch persists through the debounce; \`hydrate\` applies \`app/foreground\`; corrupt storage falls back to the initial state), \`src/lib/config.ts\` (\`hasRemoteAI\` with and without \`EXPO_PUBLIC_API_URL\`, and with \`EXPO_PUBLIC_AI_MODE=local\`) and \`src/store/providers.ts\` (\`aiProviderFor\`).
Out: rendering components, Playwright changes.

## Acceptance criteria
- [ ] \`pnpm --filter @sprint/app test\` runs at least eight real tests and passes; \`--passWithNoTests\` is removed from the script.
- [ ] Platform modules are mocked with \`MemoryStorage\` and the no-op providers from \`@sprint/core\`; no test imports Expo or React Native at runtime.
- [ ] \`pnpm verify\` passes, including typecheck of the new test files.

## Verification
\`pnpm verify\`.

## Decisions already made
You may add \`vitest\` to \`apps/app\` devDependencies at the version already used in the workspace (\`^5.0.3\`) and nothing else. Use \`vi.mock\` for the platform modules.`,
  },
  {
    title: "Web: service worker so a reload works fully offline",
    labels: ["enhancement", "roadmap"],
    body: `## Context
Roadmap, Later: "A service worker for fully offline reloads on the web." Once loaded, the web app works offline (Journey 5), but a reload with no network fails because nothing caches the static export.

## Scope
In: a hand-written \`apps/app/public/sw.js\` (no Workbox) that precaches the exported pages and \`_expo/static/**\` on install under a versioned cache name, serves static assets cache-first and navigations network-first with cache fallback, and deletes old caches on activate; registration from \`src/app/+html.tsx\` on web only, in production exports only; a header in \`apps/app/vercel.json\` so \`/sw.js\` is served with \`Cache-Control: no-cache\`.
Out: push notifications, background sync, anything native.

## Acceptance criteria
- [ ] After loading \`/\`, going offline and reloading \`/home\` and \`/mission/<id>\` renders the app from cache.
- [ ] A new deploy invalidates the previous cache (versioned cache name; old caches removed on activate).
- [ ] Journey 5 in \`apps/app/e2e/journeys.spec.ts\` gains a step that reloads offline and still sees the home screen.
- [ ] \`docs/ARCHITECTURE.md\` gets a short "Offline on the web" paragraph.
- [ ] \`pnpm verify\` and \`pnpm test:e2e\` pass; the accessibility scan is unaffected.

## Verification
\`pnpm verify && pnpm test:e2e\`. Manually: \`pnpm build:web && npx serve apps/app/dist -l 4173 -s\`, load the app, switch the browser to offline, reload.

## Decisions already made
No new dependencies. Derive the cache name from the app version in \`src/lib/config.ts\` plus the export's hashed asset list, whichever is simplest and changes on every deploy; say which in the PR. Touching \`apps/app/vercel.json\` is approved for the one header above.`,
  },
  {
    title: "Calendar awareness, step 1: the next-sprint recommendation uses a free window",
    labels: ["enhancement", "roadmap"],
    body: `## Context
Roadmap, Next 2: "You have 35 minutes before your next meeting. Run a 25-minute sprint?" \`CalendarProvider.nextFreeWindow(now)\` exists in \`packages/core/src/providers/calendar.ts\` with \`NoCalendarProvider\`; nothing consumes it yet. This step wires the engine and the home screen; a real provider is step 2.

## Scope
In, core: a \`FixedCalendarProvider(windows)\` for tests and the demo; \`recommendNext\` takes the free window as \`availableMin\` when the user has not picked a time chip and the window is at least 5 minutes; a reason line for that case. In, app: Home asks \`providers.calendar.nextFreeWindow\` once per foreground and, when a window exists, shows one line above the next-sprint card with a "Run a N-minute sprint" action that starts the recommended sprint at \`suggestedMinutes\`.
Out: a device calendar provider, settings, permissions.

## Acceptance criteria
- [ ] With \`NoCalendarProvider\` nothing changes: no copy, same recommendation, existing tests untouched.
- [ ] Core unit tests: a 35-minute window with a 45-minute next sprint gives \`suggestedMinutes: 35\` and the calendar reason; a window under 5 minutes gives no suggestion.
- [ ] Home shows the calendar line only when a window exists; copy follows the Language rules in \`docs/PRODUCT.md\`.
- [ ] \`pnpm verify\` and \`pnpm test:e2e\` pass.

## Verification
Unit tests in \`packages/core/src/next\`. Manually, swap \`calendar\` in \`apps/app/src/store/providers.ts\` for a \`FixedCalendarProvider\` and open Home.

## Decisions already made
Copy: "You have {minutes} minutes before your next event. Run a {suggested}-minute sprint?" No new dependencies.`,
  },
  {
    title: "Calendar awareness, step 2: read-only device calendar provider, opt-in",
    labels: ["enhancement", "roadmap"],
    body: `## Context
Follows "Calendar awareness, step 1". Reads the device calendar on iOS and Android to compute the next free window. Web keeps \`NoCalendarProvider\`.

## Scope
In: \`apps/app/src/platform/calendar.native.ts\` implementing \`CalendarProvider\` with expo-calendar (read-only; the earliest upcoming event start across all calendars becomes the free window) and \`calendar.web.ts\` returning \`NoCalendarProvider\`; a Settings toggle "Calendar" (off by default) with a one-line explanation; \`permissions.calendar\` and \`preferences.calendar\` in state; the \`app.json\` plugin entry and permission strings below.
Out: writing to the calendar, picking calendars, showing event titles.

## Acceptance criteria
- [ ] Toggle off: no permission prompt, no calendar reads. Toggle on: permission requested once; denied and blocked states use the same calm pattern as microphone and notifications.
- [ ] No event titles, attendees or locations are stored or logged; only the next free window is computed in memory.
- [ ] \`migrate()\` gives old snapshots \`permissions.calendar: "unknown"\` and \`preferences.calendar: false\` (unit test).
- [ ] The window computation is a pure function of (events, now) with unit tests.
- [ ] \`docs/SETUP.md\` and \`docs/ARCHITECTURE.md\` mention the provider; \`docs/DECISIONS.md\` gets an entry on read-only calendar access.
- [ ] \`pnpm verify\` and \`pnpm test:e2e\` pass; web behaviour is unchanged.

## Verification
Unit tests for migration and the window computation. Manual check on a development build.

## Decisions already made
You may add \`expo-calendar\` at the SDK 57 version (\`npx expo install expo-calendar\` picks it) and the matching \`app.json\` plugin entry with the iOS string "Sprint reads your calendar to suggest sprints that fit before your next event." and the Android permission \`READ_CALENDAR\`. Nothing else.`,
  },
  {
    title: "Spoken coach, opt-in: a line at Go and at completion, remote voice with device fallback",
    labels: ["enhancement", "roadmap"],
    body: `## Context
Roadmap, Next 3. \`/api/tts\` (ElevenLabs when configured, 503 otherwise) and the \`SpeechProvider\` (expo-speech) both exist. Nothing speaks yet.

## Scope
In: \`preferences.spokenCoach\` (default false) with a Settings toggle under Voice ("Spoken coach: a short line at Go and when you complete a sprint"); a \`RemoteSpeechProvider\` in \`apps/app/src/platform/speech.ts\` that POSTs \`/api/tts\` when \`EXPO_PUBLIC_API_URL\` is set, plays the audio with expo-audio, and falls back to the platform voice on any error; "Go." after the countdown and the completion headline on the Complete screen; silent when the preference is off, when sound is off, or when the browser blocks autoplay.
Out: continuous narration, voice selection, caching audio.

## Acceptance criteria
- [ ] Default off; nothing is spoken unless enabled. Playwright: the toggle exists and is off by default.
- [ ] With the API absent or returning 503 the device voice is used and the user sees no error.
- [ ] Spoken lines are the same strings the screen shows.
- [ ] \`migrate()\` defaults \`preferences.spokenCoach\` for old snapshots (unit test); the existing \`/api/tts\` server tests still pass.
- [ ] \`pnpm verify\` and \`pnpm test:e2e\` pass.

## Verification
Core tests for the preference default. Manually with \`pnpm server\` and no key (device voice), then with \`ELEVENLABS_API_KEY\` set (remote).

## Decisions already made
No new dependencies: expo-audio and expo-speech are already present. The provider choice stays inside \`apps/app/src/store/providers.ts\`.`,
  },
  {
    title: "Learning, step 1: record overrun and completion hour per sprint in state",
    labels: ["enhancement", "roadmap"],
    body: `## Context
Roadmap, Next 5: on-device learning of preferred focus times and typical overrun per sprint type, feeding the planner's sizing. Nothing is recorded yet. This step is core only; the planner uses it in step 2.

## Scope
In \`packages/core\`: on \`sprint/complete\` the reducer updates compact aggregates in \`state.learning\` (per energy level: sample count and mean overrun ratio; per local hour of day: completed count and focused minutes); selectors \`typicalOverrun(state, energy)\` (undefined under five samples) and \`preferredHours(state)\`; \`migrate()\` defaults \`learning\`.
Out: any UI; planner or next-action changes.

## Acceptance criteria
- [ ] Aggregates are bounded in size (no per-session history) and survive \`serialize\` and \`deserialize\`.
- [ ] Unit tests: five completions at +20% give \`typicalOverrun\` of about 1.2; four give undefined; hour buckets use the local hour of the \`now\` passed in.
- [ ] Old snapshots load with \`learning\` defaulted (migration test).
- [ ] The data model section of \`docs/ARCHITECTURE.md\` lists \`LearningState\`.
- [ ] \`pnpm verify\` passes.

## Decisions already made
Ratios rounded to two decimals; hours keyed 0 to 23. No new dependencies.`,
  },
  {
    title: "Learning, step 2: planner sizing and next-action use the learned stats",
    labels: ["enhancement", "roadmap"],
    body: `## Context
Follows "Learning, step 1". Uses \`typicalOverrun\` and \`preferredHours\` so plans fit how the person actually works.

## Scope
In \`packages/core\`: \`planLocal\` scales sprint durations by the energy level's typical overrun, bounded to plus or minus 25% and rounded to 5 minutes, only when a sample exists; \`recommendNext\` gives deep and focused sprints a small score bonus during preferred hours; the plan explanation adds one sentence when sizing was adjusted.
Out: UI beyond the explanation sentence.

## Acceptance criteria
- [ ] With no learning data, plans and recommendations are identical to today: existing tests unchanged and passing.
- [ ] Unit tests cover the scaling bounds, the rounding and the hour bonus.
- [ ] Explanation copy follows \`docs/PRODUCT.md\`, for example "Your deep sprints tend to run about 10 minutes long, so these are sized for that."
- [ ] \`pnpm verify\` passes.

## Decisions already made
No new dependencies. Blocked until step 1 is merged.`,
  },
  {
    title: "Focus music: a MusicProvider with synthesised ambient loops",
    labels: ["enhancement", "roadmap"],
    body: `## Context
Roadmap, Later: focus music and ambient sound. \`MusicProvider\` exists with \`NoMusicProvider\`. Decision 10 says sounds are generated, not licensed, so the loops are synthesised too.

## Scope
In: a deterministic Node script under \`scripts/\` that synthesises two or three short seamless loops (rain-like noise, a soft drone) into \`apps/app/assets/music/*.wav\`; \`apps/app/src/platform/music.ts\` implementing \`MusicProvider\` with expo-audio (looping, volume 0.4, pauses with the sprint, stops on complete or stop); a quiet control on the Focus screen that cycles off, loop 1, loop 2; off by default and remembered in \`preferences.music\`.
Out: streaming, licensed tracks, a music library screen.

## Acceptance criteria
- [ ] The Focus control is reachable by keyboard and screen reader with an accessible name that states the current choice.
- [ ] Music pauses and resumes with the sprint and stops when leaving Focus.
- [ ] Default off; \`migrate()\` defaults the preference (unit test).
- [ ] Added assets total under 1.5 MB.
- [ ] \`pnpm verify\` and \`pnpm test:e2e\` pass, including the accessibility scan.

## Decisions already made
No new dependencies. The generator script is committed so the assets can be regenerated.`,
  },
  {
    title: "Mission artwork: choose and wire a real image generator",
    labels: ["needs-decision", "roadmap"],
    body: `## Context
Roadmap, Next 4. The server has \`ImageGenProvider\` with a mock that returns a palette, \`IMAGE_PROVIDER\` accepts \`mock\` or \`none\`, and core's \`GeneratedVisual\` already carries an optional \`uri\`. The app renders the palette today.

## Decisions needed before an agent can take this
1. Which provider and key (OpenAI Images, Stability, Replicate, another)? Acceptable cost per mission?
2. Where do images live: returned inline as a data URL, hosted by the provider, or uploaded to storage we control? The mission title and objective are the prompt, so this is a privacy question too.
3. Size and aspect for the mission hero band; light and dark variants or one image?
4. Generate automatically when "Generated visuals" is on, or per mission on request?

## Agent-sized task once decided
Add the provider name to the env schema, implement it with a timeout and the palette fallback, add a server test with a fake fetch, and wire the client through \`ImageProvider\`.`,
  },
  {
    title: "Accounts and sync (epic)",
    labels: ["needs-decision", "roadmap"],
    body: `## Context
Roadmap, Next 1. Groundwork exists: every entity has \`id\` and \`updatedAt\`, \`ActivityEvent[]\` is an event log, and \`serialize\` and \`migrate\` handle one snapshot document. Local use must stay first.

## Decisions needed
1. Identity: email magic link, Sign in with Apple, Google, or all three? Which provider (Supabase Auth, Clerk, Firebase, our own)?
2. Storage: where the snapshot lives, in which region, under what privacy terms.
3. Strategy: last-writer-wins snapshot upload, or an event-log merge? Rules for the active sprint session.
4. Cost ceiling, and whether this ships before or after store submission.

## Agent-sized follow-ups once decided
- A \`SyncProvider\` interface in core with a no-op implementation and tests.
- Snapshot upload and download behind a Settings sign-in, with the local copy always authoritative when offline.
- Merge rules with unit tests on fixtures.`,
  },
  {
    title: "Apple Watch and Wear OS: the dial, pause and complete",
    labels: ["needs-decision", "roadmap"],
    body: `## Context
Roadmap, Later. Needs native watch targets that this repository's CI cannot build or test.

## Decisions needed
1. Priority relative to store submission.
2. Approach: a watch target through an Expo config plugin, or a separate native project?
3. Minimum feature set: show the dial, pause, complete, nothing else?

Not agent-ready until these are answered.`,
  },
  {
    title: "Shared missions and accountability",
    labels: ["needs-decision", "roadmap"],
    body: `## Context
Roadmap, Later. Depends on accounts and sync.

## Decisions needed
1. What is shared: progress only, or sprint titles too?
2. Invitation model and who can see what, with privacy defaults.
3. Whether this is a family feature, a small-team feature, or both.

Not agent-ready until accounts and sync exist and these are answered.`,
  },
  {
    title: "Subscription",
    labels: ["needs-decision", "roadmap"],
    body: `## Context
Roadmap, Later: AI planning, adaptive planning, voice coach, visuals, advanced analytics and unlimited missions behind a subscription. Never in the first-run experience.

## Decisions needed
1. Exactly what stays free.
2. Billing: RevenueCat, native StoreKit and Play Billing directly, and what on the web.
3. Price and trial.

Not agent-ready until these are answered.`,
  },
  {
    title: "Store submission checklist",
    labels: ["human"],
    body: `Manual steps from \`docs/DEPLOYMENT.md\`; not for the Agent workflow.

- [ ] \`eas init\` to set \`expo.extra.eas.projectId\`.
- [ ] App Store Connect and Play Console listings (name: Sprint, subtitle: Turn goals into momentum).
- [ ] Privacy labels: no data collected by default; goal text sent to your API only if enabled.
- [ ] Screenshots from \`pnpm shots\` or simulators.
- [ ] \`EXPO_PUBLIC_API_URL\` in the production profile if the API is live.
- [ ] Two Vercel projects (web at \`apps/app\`, API at \`apps/server\`) with their environment variables.`,
  },
];
