# Setup

## Requirements

Node 20+, pnpm 10 (`corepack enable`). For iOS/Android: the Expo Go app for a quick look, or a development build (`npx expo run:ios|android`, or EAS) because speech recognition, notifications and audio use native modules beyond Expo Go on some platforms.

## Install and run

```bash
pnpm install
pnpm web                     # http://localhost:8081 (Metro web)
pnpm app                     # Expo dev server; press i / a, or scan the QR code
pnpm server                  # http://localhost:8787 (optional)
```

## Environment

Nothing is required. Copy the examples when you want more:

```bash
cp apps/app/.env.example apps/app/.env       # EXPO_PUBLIC_API_URL to enable the API
cp apps/server/.env.example apps/server/.env # ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, SPRINT_API_TOKEN …
```

| Variable | Where | Effect when set |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | app | Plans and reflections go through the API (with local fallback) |
| `EXPO_PUBLIC_AI_MODE=local` | app | Never call the API even if a URL is set |
| `ANTHROPIC_API_KEY` | server | Plans from Claude via structured outputs |
| `ANTHROPIC_MODEL` | server | Defaults to `claude-opus-5-5` |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | server | `/api/tts` synthesises speech |
| `SPRINT_API_TOKEN` | server | Requires `Authorization: Bearer …` on every `/api/*` call |
| `CORS_ORIGINS` | server | Comma-separated origins, default `*` |
| `RATE_LIMIT_PER_MINUTE` | server | Per-client limit, default 30 |

Client code only ever reads `EXPO_PUBLIC_*`. Keys never ship in the bundle.

## Tests

```bash
pnpm test                         # core (vitest) + server (vitest)
pnpm typecheck
pnpm build:web && pnpm test:e2e   # Playwright journeys against apps/app/dist
SHOTS=1 pnpm --filter @sprint/app exec playwright test e2e/visual.spec.ts   # screenshots to test-results/shots
```

Playwright uses the Chromium at `PLAYWRIGHT_CHROMIUM_PATH` or `/opt/pw-browsers/chromium`; run `npx playwright install chromium` and unset the variable on a normal machine.

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md). Screens live in `apps/app/src/app`, everything else in `apps/app/src/{components,theme,hooks,store,platform,lib}`.
