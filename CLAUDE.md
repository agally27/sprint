# CLAUDE.md

Sprint is a personal momentum engine: you say a goal, it becomes a mission of short, focused sprints, and the app always answers one question, *what should I do next?* This file is the working contract for anyone changing the repository, human or agent. Read it before editing. The product and architecture detail lives in `docs/`; this file only says what you need in order to act.

## 1. Goals

- **One goal, one plan, one next step.** Everything is organised around the next sprint. No dashboards, no backlog views, no streaks, no leaderboards, no chat screen as the main interface (`docs/PRODUCT.md`).
- **Works offline and without AI.** Every feature has a deterministic local fallback. The API and the model only make things better; they are never required.
- **No guilt.** Copy never blames. Missed days reschedule themselves. Momentum cools, it never resets.
- **One codebase, three platforms.** iOS, Android and web from Expo, with a designed desktop layout.
- **Toward store submission.** `docs/ROADMAP.md` is the priority order. The MVP works; the roadmap makes it better for someone using it tomorrow.

## 2. Repository map

```
apps/app        Expo universal app (Expo Router, Reanimated, SVG). Screens in src/app, the rest in src/{components,theme,hooks,store,platform,lib}. Playwright journeys in e2e/.
apps/server     Sprint API (Hono). Keeps provider keys server-side. Bundled for Vercel by scripts/build-vercel.mjs.
packages/core   Pure TypeScript domain and engines: planning, timer, momentum, next-action, adaptation, coach, review, voice, notifications, providers, state.
docs/           PRODUCT, ARCHITECTURE, DESIGN_SYSTEM, AI_ARCHITECTURE, DECISIONS, SETUP, DEPLOYMENT, ROADMAP.
scripts/        Repository tooling (backlog issue creation).
.github/        CI (ci.yml), the unattended agent workflow (agent.yml), issue and PR templates.
```

Stack: pnpm 10 workspace (`node-linker=hoisted`), Node 22, TypeScript 6 strict, Expo SDK 57 / React Native 0.86 / React 19, Hono 4, zod 4, vitest 5, Playwright 1.63, Prettier 3.

## 3. Architecture rules

These are the decisions in `docs/DECISIONS.md` and `docs/ARCHITECTURE.md`, stated as rules.

1. **The core is pure.** `packages/core` has no React, no React Native, no Expo, no `fetch`, no platform APIs, and no `Date.now()` inside engines. Every engine is a function of `(state, now)`. That is what makes the timer, planner, rescheduling and rewards testable in milliseconds.
2. **One reducer, one snapshot.** All state changes go through `reduce(state, action)` in `packages/core/src/state`. New behaviour means a new action type, a reducer case and a test. The snapshot persists as one JSON document; `migrate()` must keep loading every older snapshot, so additive changes only, with defaults.
3. **Time is data.** Timer state is timestamps (`startedAt`, `pauses[]`, `durationMs`, `lastSeenAt`); remaining time is always derived through `timer.derive`. Never add a tick counter or a running total.
4. **Providers behind interfaces.** AI, voice, speech, audio, music, image, haptics, calendar, notifications and storage are interfaces in `packages/core/src/providers` with mock or no-op implementations. Concrete implementations live in `apps/app/src/platform`, and `apps/app/src/store/providers.ts` is the one place that chooses them. A screen never imports a platform module directly.
5. **Local first, model second.** The local planner always works. A model path returns the same `PlanDraft` shape, is schema-validated, and falls back on any failure. The user never sees an AI error.
6. **The API holds keys and nothing else.** `apps/server` validates every body with zod, degrades without keys, and logs route, status and duration only. Never bodies, never goal text. Client code reads `EXPO_PUBLIC_*` variables only. No secret ships in a bundle or appears in a log.
7. **Record decisions.** A choice that shapes the product gets a numbered entry at the end of `docs/DECISIONS.md`, three to five sentences.

## 4. Conventions

- **TypeScript.** `strict` and `noUncheckedIndexedAccess` are on. No `any`; use `unknown` and narrow. Prefer plain functions and data over classes, except provider implementations.
- **Formatting.** Prettier owns it (`pnpm format`); `pnpm verify` fails on unformatted files. Do not hand-wrap, do not fight the formatter. Markdown and JSON are left alone on purpose.
- **Files and exports.** Screens in `apps/app/src/app` are Expo Router routes with one default export each. Everything else uses named exports. App code imports its own modules through the `@/` alias. Core folders export through their `index.ts`, and `packages/core/src/index.ts` re-exports them.
- **Tests.** vitest with `globals: true`, colocated as `*.test.ts`. Changes to core or server logic come with a unit test. Engines take `now`, so tests pass fixed timestamps. UI journeys live in `apps/app/e2e` (Playwright, run against the static web export). A new screen or control needs a `testID` and an accessible name; the axe scan runs in CI.
- **Copy.** Follow the Language section of `docs/PRODUCT.md`. Use *Start sprint, Next, Pause, Complete, Mission, Milestone, Momentum, Focus, What next?* Never "you failed", "you're behind", "you missed", streaks, points for opening the app, exclamation marks, or emoji in UI.
- **Accessibility.** Every interactive element has an accessible name, targets are at least 44pt, motion respects `useReducedMotion`, colour contrast meets WCAG AA.
- **Dependencies.** The lockfile is committed and installs are `--frozen-lockfile`. Adding, removing or upgrading a dependency is a charter decision (section 7). Never edit `pnpm-lock.yaml` by hand.
- **Commits.** Imperative subject, area prefix when it helps (`Focus: tolerate wake-lock races on web`). Small, focused commits. No model names or session identifiers in commits, code or comments.
- **Docs.** Update the document that describes what you changed (`docs/ARCHITECTURE.md`, `docs/AI_ARCHITECTURE.md`, `docs/SETUP.md`, `README.md`). Do not add new top-level documents for one feature.

## 5. Build, run, test

| Command | What it does | Typical time |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Install the workspace | 1 to 2 min cold |
| `pnpm web` / `pnpm app` / `pnpm server` | Dev servers: Metro web, Expo, API on :8787 | |
| `pnpm format` / `pnpm format:check` | Prettier write / check | seconds |
| `pnpm typecheck` | `tsc --noEmit` in every package | 10 s |
| `pnpm test` | vitest: core (74 tests) and server (8 tests) | 5 s |
| `pnpm --filter @sprint/server build:vercel && pnpm --filter @sprint/server smoke:vercel` | Bundle the API as a Vercel function and hit its routes | 2 s |
| `pnpm build:web` | Static web export to `apps/app/dist` | 50 s |
| **`pnpm verify`** | **All of the above checks in one command. This is the gate.** | about 1.5 min |
| `pnpm test:e2e` | Playwright journeys and accessibility scan against `apps/app/dist` (run `pnpm build:web` or `pnpm verify` first; needs Chromium) | 1.5 to 2 min |
| `pnpm shots` | Visual walkthrough screenshots to `apps/app/test-results/shots` | |

Playwright uses the Chromium at `PLAYWRIGHT_CHROMIUM_PATH` (default `/opt/pw-browsers/chromium`). On a normal machine or a CI runner, run `pnpm --filter @sprint/app exec playwright install --with-deps chromium` and set `PLAYWRIGHT_CHROMIUM_PATH=""`. No environment variables are required for anything else; `docs/SETUP.md` lists the optional ones.

Run the narrowest check while iterating (`pnpm --filter @sprint/core test`), and `pnpm verify` before every push.

## 6. Definition of done

A change is done when every point holds:

1. `pnpm verify` passes locally, and CI is green on the pull request.
2. `pnpm test:e2e` passes when anything under `apps/app` changed. CI runs it regardless; running it yourself is how you avoid a failed CI round.
3. New behaviour has a test at the lowest layer that can express it: core unit test first, then server unit test, then a Playwright journey.
4. Every acceptance criterion in the issue is met, or the PR states which one is not and why.
5. The docs that describe the changed behaviour are updated, and a shaping choice has a `docs/DECISIONS.md` entry.
6. No TODO left behind without an issue number.
7. No dependency, secret, permission, CI or agent-workflow change unless the issue asked for it.
8. The PR body follows `.github/pull_request_template.md`: Summary, `Closes #N`, Verification (the exact commands and results), Decisions, Open questions.
9. Nothing was pushed to `main`. Branch plus pull request, always.

## 7. Decision charter (DRAFT)

> **Status: DRAFT, awaiting owner review.** Until it is approved, treat every unlisted case as "escalate".

### Decide alone

- Implementation details inside the architecture rules: file placement within the existing folders, function and type names, internal data shapes, test structure.
- Which existing pattern to follow (sheet versus modal, a chip row versus a switch) by copying the closest existing screen or component.
- Copy for new UI that follows the Language rules, and small wording fixes.
- Refactors confined to the files the issue already touches, when they remove code and keep behaviour.
- Fixing a bug met on the way, when the fix is small, tested and mentioned in the PR.
- Adding tests, and small test refactors.
- Documentation that describes what changed.
- Choosing where in the roadmap order to stop when the issue's scope is larger than one run: deliver the verified part, say what is left.

### Escalate (comment on the issue, then stop without a PR)

- Adding, removing or upgrading any dependency, unless the issue names the exact package. This includes dev dependencies and Expo config plugins.
- A change to the persisted state that `migrate()` cannot absorb with defaults, or anything that deletes or rewrites user data.
- A new network call from the app, new data sent to the API, or any change to what is logged.
- New permissions (microphone, notifications, calendar, background modes), native modules, or edits to `app.json`, `eas.json` or either `vercel.json`.
- Visual identity: the dial, colour tokens, type scale, spacing scale, motion defaults (`docs/DESIGN_SYSTEM.md`).
- Product behaviour the issue did not ask for, anything on the "Not planned" list, or copy that changes the tone.
- Security-relevant code: auth, CORS, rate limiting, token handling, the API's environment schema.
- Edits to `.github/`, `CLAUDE.md`, or the agent workflow.
- Acceptance criteria that contradict each other, contradict this file, or cannot be verified in CI.
- Any conflict between an issue comment and the issue body: the body wins; ask about the rest.

### How to escalate

Post exactly one comment on the issue containing: what you understood the task to be, the specific question or questions, the options you see, and your recommendation. Then stop. Do not guess at ambiguous scope and do not open a PR for it. The workflow labels the issue `agent:needs-human`; a human answers in the issue and re-labels it `agent:ready`, and the next run reads the whole thread.

If you run out of turns or time with verified work on the branch, push it and open the PR anyway, listing what remains. A partial, verified PR beats an unpushed branch.

## 8. Unattended agent runs

`.github/workflows/agent.yml` runs the official Claude Code GitHub Action when an issue receives the `agent:ready` label.

- **Labels.** `agent:ready` (queued) becomes `agent:working` when picked up, then `agent:pr-open` when a PR exists or `agent:needs-human` when the run ended without one (a question, an exhausted budget, or a failure). The tracking comment on the issue has the details. Re-label `agent:ready` to run again; the new run reads the full thread.
- **Branches.** Each run cuts `agent/issue-<n>-<title words>` from `main`, pushes there, and opens a PR against `main`. Nothing merges automatically. Humans review every PR.
- **Budget.** The job has a hard `timeout-minutes` and a `--max-turns` cap; both are set at the top of the workflow. Runs for different issues execute in parallel, so label one or two issues at a time.
- **Writing issues.** Use the "Agent task" issue form. One issue is one PR. Acceptance criteria are checkable statements. Put anything the agent would otherwise have to escalate under "Decisions already made".
- **Backlog.** `scripts/backlog/issues.mjs` holds the proposed backlog; `node scripts/backlog/create-issues.mjs --apply` creates the labels and issues with the gh CLI (dry run without `--apply`).

## 9. Never

- Never push to `main`. Never force-push. Never rewrite history on a branch you did not create.
- Never commit a secret or a `.env` file, and never print environment variables in logs.
- Never skip, disable, weaken or quarantine a test to get green. Fix the cause.
- Never edit `pnpm-lock.yaml` by hand, and never run an install that is not `--frozen-lockfile` unless the issue authorises a dependency change.
- Never send goal text, plans or any user data anywhere new.
