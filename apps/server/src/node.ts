import { serve } from "@hono/node-server";
import { createApp } from "./index";
import { loadEnv } from "./env";

const env = loadEnv();
const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] Sprint API listening on http://localhost:${info.port} (ai: ${env.ANTHROPIC_API_KEY ? "anthropic" : "local"}, tts: ${env.ELEVENLABS_API_KEY ? "elevenlabs" : "none"})`);
});
