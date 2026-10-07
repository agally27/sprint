# Deployment

Sprint has three deployables. None has been deployed yet; everything below is prepared and tested locally.

## Web → Vercel (or any static host)

```bash
cd apps/app && pnpm build:web     # → apps/app/dist (static, SPA fallback not needed: every route is pre-rendered)
```

`apps/app/vercel.json` sets the build command and output directory for a Vercel project rooted at `apps/app`. Set `EXPO_PUBLIC_API_URL` in the project's environment to point at the API. The manifest and icons in `apps/app/public` make the site installable.

## API → Vercel (serverless) or Node

- **Vercel**: create a project rooted at `apps/server`. `api/index.ts` exports the Hono handlers; `vercel.json` rewrites `/api/*` to it. Add `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `SPRINT_API_TOKEN`, `CORS_ORIGINS` as environment variables.
- **Node**: `pnpm --filter @sprint/server start` runs `src/node.ts` on `PORT` (default 8787). Any container works.

The in-memory rate limiter is per instance; put a platform rate limit in front for production.

## Mobile → EAS

```bash
cd apps/app
npx eas-cli@latest build --profile preview --platform all    # internal distribution
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios|android
```

`eas.json` defines `development`, `preview` and `production`. Before the first build set `expo.extra.eas.projectId` (`eas init`) and, for the store listings, the bundle id `app.sprint.mobile` is already configured in `app.json` along with permissions strings for microphone and speech recognition, the notifications channel, icons and splash.

Checklist before submission:
- [ ] App Store Connect / Play Console listings (name: Sprint, subtitle: Turn goals into momentum)
- [ ] Privacy nutrition labels: no data collected by default; goal text sent to your API only if enabled
- [ ] Screenshots from the visual walkthrough (`SHOTS=1` Playwright run, or simulators)
- [ ] `EXPO_PUBLIC_API_URL` set in the production profile if the API is live

## Continuous integration

`.github/workflows/ci.yml` runs typecheck, unit tests, the web export and the Playwright journeys on every push and pull request.
