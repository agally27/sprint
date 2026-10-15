import { describe, expect, it } from "vitest";
import { isPlanDraft } from "@sprint/core";
import { createApp } from "./index";
import { NoTTSProvider, type TTSProvider } from "./providers/tts";

const NOW = new Date(2026, 9, 7, 10, 0).getTime();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (res: Response) => res.json() as Promise<any>;

describe("Sprint API", () => {
  it("reports health and providers in local mode", async () => {
    const app = createApp({ env: { NODE_ENV: "test" } });
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.providers.ai).toBe("local");
    expect(body.providers.tts).toBe("none");
  });

  it("plans a goal with the local provider when no key is set", async () => {
    const app = createApp({ env: { NODE_ENV: "test" } });
    const res = await app.request("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goalText: "Launch my website by Christmas", now: NOW }) });
    expect(res.status).toBe(200);
    const plan = await json(res);
    expect(isPlanDraft(plan)).toBe(true);
    expect(plan.title).toBe("Launch My Website");
    expect(plan.source).toBe("local");
  });

  it("rejects bad input kindly", async () => {
    const app = createApp({ env: { NODE_ENV: "test" } });
    const res = await app.request("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/goal/);
  });

  it("requires the shared token when configured", async () => {
    const app = createApp({ env: { NODE_ENV: "test", SPRINT_API_TOKEN: "secret" } });
    const denied = await app.request("/api/health");
    expect(denied.status).toBe(401);
    const ok = await app.request("/api/health", { headers: { authorization: "Bearer secret" } });
    expect(ok.status).toBe(200);
  });

  it("rate limits per client", async () => {
    const app = createApp({ env: { NODE_ENV: "test", RATE_LIMIT_PER_MINUTE: 2 } });
    const h = { "x-forwarded-for": "1.2.3.4" };
    expect((await app.request("/api/health", { headers: h })).status).toBe(200);
    expect((await app.request("/api/health", { headers: h })).status).toBe(200);
    const limited = await app.request("/api/health", { headers: h });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect((await app.request("/api/health", { headers: { "x-forwarded-for": "5.6.7.8" } })).status).toBe(200);
  });

  it("reports voice as unavailable without a key, and streams audio with one", async () => {
    const app = createApp({ env: { NODE_ENV: "test" }, tts: new NoTTSProvider() });
    const res = await app.request("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "You moved the goal forward." }) });
    expect(res.status).toBe(503);
    expect((await json(res)).available).toBe(false);

    const fake: TTSProvider = { name: "fake", available: true, synthesize: async () => ({ audio: new Uint8Array([1, 2, 3]).buffer, contentType: "audio/mpeg" }) };
    const app2 = createApp({ env: { NODE_ENV: "test" }, tts: fake });
    const res2 = await app2.request("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Go." }) });
    expect(res2.status).toBe(200);
    expect(res2.headers.get("content-type")).toBe("audio/mpeg");
    expect((await res2.arrayBuffer()).byteLength).toBe(3);
  });

  it("returns a palette visual from the mock image provider", async () => {
    const app = createApp({ env: { NODE_ENV: "test" } });
    const res = await app.request("/api/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ missionTitle: "Run a 10K", objective: "Run a 10K", category: "health" }),
    });
    expect(res.status).toBe(200);
    const visual = await json(res);
    expect(visual.provider).toBe("mock");
    expect(visual.palette).toHaveLength(2);
  });

  it("reflects on a week", async () => {
    const app = createApp({ env: { NODE_ENV: "test" } });
    const res = await app.request("/api/reflect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sprintsCompleted: 11, focusedMinutes: 300, missions: [{ title: "Launch My Website", progress: 0.7, completed: false }], activeDays: 4, now: NOW }),
    });
    expect(res.status).toBe(200);
    expect((await json(res)).text).toMatch(/11 sprints/);
  });
});
