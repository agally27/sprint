# Deployment

Sprint has three deployables. None has been deployed yet; everything below is prepared and tested locally.

## Vercel: two projects from one repo

Create **two** Vercel projects from this repository. For each, set the **Root Directory** as below and turn on **Include source files outside of the Root Directory** (both depend on the workspace root and its lockfile). Leave the Framework Preset as **Other**; each project's `vercel.json` supplies the commands.

| Project | Root Directory | What it deploys |
| --- | --- | --- |
| Sprint web | `apps/app` | Static export of the Expo web app |
| Sprint API | `apps/server` | One serverless function at `/api/*` |

### Web (`apps/app`)

`vercel.json` runs `pnpm --filter @sprint/app build:web` and serves `dist`. It enables clean URLs (so `/home` serves `home.html`) and rewrites `/mission/:id` to the exported dynamic page, so reloads and deep links work. Cache and security headers are set there too. Set `EXPO_PUBLIC_API_URL` to the API project's URL. The manifest and icons in `apps/app/public` make the site installable.

### API (`apps/server`)

Vercel is **not** asked to compile the TypeScript. `pnpm run build:vercel` runs `scripts/build-vercel.mjs`, which bundles `src/vercel.ts` with esbuild into a single plain JavaScript file and writes it in Vercel's [Build Output API](https://vercel.com/docs/build-output-api) layout (`.vercel/output`). That avoids two failure modes seen in practice: Vercel's stricter TypeScript pass (ESM with NodeNext resolution), and the `@sprint/core` workspace package being shipped as `.ts` source, which Node cannot load from `node_modules`. Add `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `SPRINT_API_TOKEN` and `CORS_ORIGINS` as environment variables.

Check a deploy locally before pushing, using Vercel's own builder:

```bash
cd apps/server
pnpm run build:vercel      # writes .vercel/output
npx vercel build --yes     # needs a stub .vercel/project.json; no account required
```

Any other host can run the API directly: `pnpm --filter @sprint/server start` serves on `PORT` (default 8787) from `src/node.ts`.

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

`.github/workflows/ci.yml` runs `pnpm verify` (format check, typecheck, unit tests, the API bundled and smoke-tested, the web export) and then the Playwright journeys on every push and pull request. `.github/workflows/agent.yml` runs the Claude Code GitHub Action on issues labelled `agent:ready`; see [CLAUDE.md](../CLAUDE.md).
