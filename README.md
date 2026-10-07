# Sprint

**Turn goals into momentum.**

Sprint is a personal momentum engine. You tell it what you want to achieve, in your own words, and it turns that into a mission: a few milestones made of short, focused sprints you can start right now. It answers one question at any moment: *what should I do next?*

```
GOAL → PLAN → SPRINT → FOCUS → COMPLETE → REWARD → NEXT → MOMENTUM
```

- **One goal, one plan, one next step.** No dashboards, no backlog grooming.
- **A timer that feels like a product.** The dial is the identity of Sprint.
- **No guilt.** Missed days reschedule themselves. Momentum cools slowly and never resets.
- **Works offline, works without AI.** A local planner builds a good plan from your goal with no keys at all; a server-side AI provider makes it better when configured.
- **iOS, Android and web** from one codebase (Expo), with a desktop layout that shows more rather than less.

## Repository

```
apps/app        Expo universal app (iOS, Android, web) — Expo Router, Reanimated, SVG
apps/server     Sprint API (Hono) — keeps AI, voice and image keys server-side
packages/core   Pure TypeScript domain + engines — planner, timer, momentum, next-action, adaptation
docs/           Product, architecture, design system, AI, decisions, setup, deployment, roadmap
```

## Quick start

```bash
pnpm install
pnpm web            # web dev server (apps/app)
pnpm app            # Expo dev server for iOS / Android
pnpm server         # API on http://localhost:8787 (optional; the app runs without it)
pnpm test           # unit + journey tests in core and server
pnpm build:web && pnpm test:e2e   # Playwright journeys against the static web build
```

No environment variables are required. See [docs/SETUP.md](docs/SETUP.md) for the optional ones (Anthropic planning, ElevenLabs voice, API token) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel and EAS.

## Documentation

| Doc | What it covers |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Philosophy, the loop, screens, copy rules, what Sprint is not |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Packages, state model, timer, offline, providers, data flow |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, type, the dial, motion, accessibility |
| [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) | Planner abstraction, local vs remote, prompts, fallbacks, privacy |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why Expo, why a pure core, why no streaks, and more |
| [docs/SETUP.md](docs/SETUP.md) | Local development, environment, tests |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Web (Vercel), API (Vercel/Node), mobile (EAS) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What's next, in order |

## Status

Sprint is a working MVP: goal creation, planning, missions, the dial, completion and rewards, next-action recommendations, adaptive rescheduling, voice commands, notifications, haptics, offline persistence, and an API with local fallbacks. It has not been submitted to the App Store or Google Play. See the roadmap.
