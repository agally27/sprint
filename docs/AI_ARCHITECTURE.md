# AI architecture

## Principle

The product never depends on a model. Everything AI does has a deterministic, local equivalent that is good enough to ship.

## Layers

```
UI  ──►  AIProvider (core interface)
            ├─ LocalAIProvider      planLocal(): parse → template → scale → explain   (on device)
            └─ RemoteAIProvider     POST /api/plan → validate shape → or fall back to local
                                        │
                              apps/server ServerAIProvider
                                        ├─ AnthropicAIProvider  (structured output, zod-validated)
                                        └─ LocalServerAIProvider (same local planner)
```

### Goal understanding (`core/planning/parseGoal.ts`)

Runs on device, always. Extracts the objective ("I'd really like to learn the piano" → "Learn the piano"), the deadline (Christmas, Friday, next Monday, in three weeks, by 15 December, end of the month, today, this week…), a timeframe hint, an archetype (website, app, book, writing, dissertation, exam, running, strength, fitness, language, skill, home, business, presentation, finance, job, event, generic), a category and a confidence.

### Local planner (`core/planning/planner.ts`)

Each archetype has a hand-written playbook: milestones with concrete sprint actions, durations and energy, with essentials flagged. The planner scales the playbook to the time available (a goal due today keeps only essentials, at most 45 minutes each), schedules sprints across the horizon at a sustainable daily budget, and writes a one-sentence explanation. Ambiguous archetypes ask one clarifying question with options.

### Remote planner (`apps/server/src/providers/ai.ts`)

Uses the Anthropic SDK with structured outputs (`messages.parse` + a zod schema), so the model can only return a valid plan. The prompt encodes Sprint's rules: concrete actions, 5–90 minute sprints, 3–6 milestones, time-aware, no guilt, one clarifying question only when it changes the plan. Deadlines are still parsed locally and passed as constraints. On refusal, invalid output, timeout or any API error the server returns the local plan. Model and effort are configurable (`ANTHROPIC_MODEL`).

### Next action, coach, adaptation, review

These are rule-based engines in core and run everywhere, including offline. The weekly reflection sentence can optionally come from the model (`/api/reflect`).

## Fallback matrix

| Situation | Behaviour |
| --- | --- |
| No API URL configured | Local planner, instantly |
| API unreachable / timeout / 5xx | Local planner, user never sees an error |
| Model refuses or returns an invalid shape | Local planner |
| AI disabled in settings | Local planner |
| TTS unavailable | Device voice (expo-speech) |
| Speech recognition unavailable | Typing, with a one-line explanation |

## Privacy

- Only the goal sentence (and a clarification answer) is sent to the API, and only when AI is enabled and an API is configured. Plans, sprints, history and reflections stay on the device.
- The server logs route, status and duration. Never bodies, never goal text.
- Microphone audio is processed by the platform's speech service; Sprint never stores recordings.
- Keys exist only on the server. The client reads `EXPO_PUBLIC_*` variables only.

## Adding a provider

Implement `AIProvider` (client) or `ServerAIProvider` (server). Return a `PlanDraft`. Register it in `apps/app/src/store/providers.ts` or `apps/server/src/providers/ai.ts`. The same applies to `SpeechProvider`, `VoiceProvider`, `ImageProvider`, `MusicProvider` and `CalendarProvider`.
