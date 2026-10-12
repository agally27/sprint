import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv, type Env } from "./env";
import { createAIProvider, type ServerAIProvider } from "./providers/ai";
import { createTTSProvider, type TTSProvider } from "./providers/tts";
import { createImageProvider, type ImageGenProvider } from "./providers/image";
import { RateLimiter } from "./ratelimit";
import { ImageRequestSchema, PlanRequestSchema, ReflectRequestSchema, TtsRequestSchema } from "./schemas";

export interface AppDeps {
  env?: Partial<Env>;
  ai?: ServerAIProvider;
  tts?: TTSProvider;
  image?: ImageGenProvider;
  now?: () => number;
}

/**
 * The Sprint API. Small on purpose: it holds the keys the client must never
 * see and nothing else. Every route degrades gracefully without keys.
 */
export function createApp(deps: AppDeps = {}) {
  const env: Env = { ...loadEnv(), ...deps.env };
  const ai = deps.ai ?? createAIProvider(env);
  const tts = deps.tts ?? createTTSProvider(env);
  const image = deps.image ?? createImageProvider(env);
  const limiter = new RateLimiter(env.RATE_LIMIT_PER_MINUTE);
  const now = deps.now ?? (() => Date.now());

  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGINS === "*" ? "*" : env.CORS_ORIGINS.split(",").map((s) => s.trim()),
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["content-type", "authorization"],
      maxAge: 600,
    }),
  );

  // Privacy-aware logging: route, status, duration. Never bodies, never goal text.
  app.use("*", async (c, next) => {
    const start = now();
    await next();
    if (env.NODE_ENV !== "test") console.log(`[api] ${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} ${now() - start}ms`);
  });

  app.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    if (env.SPRINT_API_TOKEN) {
      const auth = c.req.header("authorization") ?? "";
      if (auth !== `Bearer ${env.SPRINT_API_TOKEN}`) return c.json({ error: "unauthorised" }, 401);
    }
    const key = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("cf-connecting-ip") || "anonymous";
    const r = limiter.allow(key, now());
    if (!r.ok) {
      c.header("retry-after", String(r.retryAfterSec));
      return c.json({ error: "Too many requests. Try again shortly." }, 429);
    }
    return next();
  });

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      providers: { ai: ai.name, tts: tts.name, image: image?.name ?? "none" },
      version: "0.1.0",
    }),
  );

  app.post("/api/plan", async (c) => {
    const body = PlanRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "That goal couldn't be read. Try a short sentence." }, 400);
    const plan = await ai.plan(body.data);
    return c.json(plan);
  });

  app.post("/api/reflect", async (c) => {
    const body = ReflectRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "Invalid review summary." }, 400);
    const text = await ai.reflect(body.data);
    return c.json({ text });
  });

  app.post("/api/tts", async (c) => {
    if (!tts.available) return c.json({ available: false, error: "Voice synthesis isn't configured. The app uses the device voice instead." }, 503);
    const body = TtsRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "Nothing to say." }, 400);
    try {
      const { audio, contentType } = await tts.synthesize(body.data.text);
      return new Response(audio, { headers: { "content-type": contentType, "cache-control": "private, max-age=3600" } });
    } catch {
      return c.json({ available: false, error: "Voice synthesis is unavailable right now." }, 503);
    }
  });

  app.post("/api/image", async (c) => {
    if (!image) return c.json({ available: false, error: "Image generation isn't configured." }, 503);
    const body = ImageRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: "Invalid image request." }, 400);
    return c.json(await image.generate(body.data));
  });

  app.notFound((c) => c.json({ error: "Not found" }, 404));
  app.onError((err, c) => {
    console.error(`[api] ${err.name}`);
    return c.json({ error: "Something interrupted Sprint. Your progress is safe. Try again." }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
