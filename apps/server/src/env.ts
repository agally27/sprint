import { z } from "zod";

/**
 * Server configuration. Every secret lives here and only here.
 * Missing keys never break the server: each feature degrades to a local mode.
 */
const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8787),
  /** Comma-separated allowed origins. "*" in development. */
  CORS_ORIGINS: z.string().default("*"),
  /** Optional shared secret the app sends as a bearer token. */
  SPRINT_API_TOKEN: z.string().optional(),
  /** Anthropic planning. */
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  /** ElevenLabs voice. */
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default("21m00Tcm4TlvDq8ikWAM"),
  ELEVENLABS_MODEL_ID: z.string().default("eleven_multilingual_v2"),
  /** Image generation. Provider-agnostic; "mock" needs no key. */
  IMAGE_PROVIDER: z.enum(["mock", "none"]).default("mock"),
  /** Requests per minute per client. */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(30),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    // Fall back to defaults rather than refusing to start; the app must keep working.
    return EnvSchema.parse({});
  }
  return parsed.data;
}
