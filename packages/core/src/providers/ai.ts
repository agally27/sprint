import type { Millis } from "../domain/types";
import { planLocal } from "../planning/planner";
import type { PlanDraft, PlanRequest } from "../planning/types";

/**
 * AI abstraction. The app only ever talks to an AIProvider; which model or
 * service answers is a configuration detail. Every provider must be able to
 * fail gracefully, and the LocalAIProvider must always work.
 */
export interface AIProvider {
  readonly name: string;
  /** Turn a goal into a plan. Must resolve or reject within a reasonable time. */
  planMission(req: PlanRequest, signal?: AbortSignal): Promise<PlanDraft>;
  /** A one-line reflection for the weekly review. Optional. */
  reflect?(summary: ReflectionInput, signal?: AbortSignal): Promise<string>;
}

export interface ReflectionInput {
  sprintsCompleted: number;
  focusedMinutes: number;
  missions: Array<{ title: string; progress: number; completed: boolean }>;
  activeDays: number;
  now: Millis;
}

export interface LocalAIOptions {
  /** Simulated thinking time so the planning screen can breathe. */
  latencyMs?: number;
}

/** Deterministic planner. Instant, offline, and the fallback for everything else. */
export class LocalAIProvider implements AIProvider {
  readonly name = "local";
  constructor(private readonly options: LocalAIOptions = {}) {}

  async planMission(req: PlanRequest, signal?: AbortSignal): Promise<PlanDraft> {
    const draft = planLocal(req);
    const wait = this.options.latencyMs ?? 0;
    if (wait > 0) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, wait);
        signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new Error("aborted"));
        });
      });
    }
    return draft;
  }
}

export interface RemoteAIOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Attached as a bearer token when sync accounts exist. */
  getToken?: () => Promise<string | undefined>;
}

/**
 * Talks to the Sprint API, which holds the real model keys. Falls back to the
 * local planner on any failure so the product never collapses.
 */
export class RemoteAIProvider implements AIProvider {
  readonly name = "remote";
  private readonly fallback = new LocalAIProvider();
  constructor(private readonly options: RemoteAIOptions) {}

  async planMission(req: PlanRequest, signal?: AbortSignal): Promise<PlanDraft> {
    try {
      const draft = await this.post<PlanDraft>("/api/plan", req, signal);
      if (!isPlanDraft(draft)) throw new Error("bad plan shape");
      return { ...draft, source: "ai" };
    } catch {
      return this.fallback.planMission(req, signal);
    }
  }

  async reflect(summary: ReflectionInput, signal?: AbortSignal): Promise<string> {
    const res = await this.post<{ text: string }>("/api/reflect", summary, signal);
    return res.text;
  }

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const f = this.options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 12_000);
    signal?.addEventListener("abort", () => controller.abort());
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      const token = await this.options.getToken?.();
      if (token) headers.authorization = `Bearer ${token}`;
      const res = await f(`${this.options.baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function isPlanDraft(x: unknown): x is PlanDraft {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  if (typeof p.title !== "string" || typeof p.objective !== "string" || !Array.isArray(p.milestones)) return false;
  return p.milestones.every(
    (m) =>
      m &&
      typeof m === "object" &&
      typeof (m as { title?: unknown }).title === "string" &&
      Array.isArray((m as { sprints?: unknown }).sprints) &&
      ((m as { sprints: unknown[] }).sprints as unknown[]).every(
        (s) => s && typeof s === "object" && typeof (s as { title?: unknown }).title === "string" && typeof (s as { durationMin?: unknown }).durationMin === "number",
      ),
  );
}
