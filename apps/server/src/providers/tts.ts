import type { Env } from "../env";

/**
 * Text-to-speech. ElevenLabs when a key exists; otherwise the server reports
 * "unavailable" and the app uses the device voice instead.
 */
export interface TTSProvider {
  readonly name: string;
  readonly available: boolean;
  synthesize(text: string, signal?: AbortSignal): Promise<{ audio: ArrayBuffer; contentType: string }>;
}

export class NoTTSProvider implements TTSProvider {
  readonly name = "none";
  readonly available = false;
  async synthesize(): Promise<{ audio: ArrayBuffer; contentType: string }> {
    throw new Error("tts unavailable");
  }
}

export class ElevenLabsTTSProvider implements TTSProvider {
  readonly name = "elevenlabs";
  readonly available = true;
  constructor(
    private readonly env: Env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async synthesize(text: string, signal?: AbortSignal) {
    const res = await this.fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(this.env.ELEVENLABS_VOICE_ID)}`, {
      method: "POST",
      headers: { "xi-api-key": this.env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: this.env.ELEVENLABS_MODEL_ID, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) throw new Error(`elevenlabs ${res.status}`);
    return { audio: await res.arrayBuffer(), contentType: res.headers.get("content-type") ?? "audio/mpeg" };
  }
}

export function createTTSProvider(env: Env, fetchImpl?: typeof fetch): TTSProvider {
  return env.ELEVENLABS_API_KEY ? new ElevenLabsTTSProvider(env, fetchImpl) : new NoTTSProvider();
}
