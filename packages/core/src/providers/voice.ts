import type { PermissionState } from "../domain/types";

/**
 * Speech-to-text. Platform providers wrap native recognition; a cloud provider
 * can be added without touching the UI.
 */
export interface VoiceListeners {
  onPartial?(transcript: string): void;
  onFinal(transcript: string): void;
  onError(error: VoiceError): void;
  onEnd?(): void;
}

export type VoiceError = "not-allowed" | "no-speech" | "network" | "aborted" | "unavailable" | "unknown";

export interface VoiceProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  getPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  start(listeners: VoiceListeners, options?: { lang?: string; continuous?: boolean }): Promise<void>;
  stop(): Promise<void>;
  abort(): Promise<void>;
}

/** Scriptable provider for tests and demos. */
export class MockVoiceProvider implements VoiceProvider {
  readonly name = "mock";
  permission: PermissionState = "undetermined";
  available = true;
  private listeners?: VoiceListeners;
  constructor(private readonly script: string[] = []) {}

  async isAvailable() {
    return this.available;
  }
  async getPermission() {
    return this.permission;
  }
  async requestPermission() {
    if (this.permission === "undetermined") this.permission = "granted";
    return this.permission;
  }
  async start(listeners: VoiceListeners) {
    if (!this.available) return listeners.onError("unavailable");
    if (this.permission !== "granted") return listeners.onError("not-allowed");
    this.listeners = listeners;
    const next = this.script.shift();
    if (next !== undefined) {
      listeners.onPartial?.(next.slice(0, Math.ceil(next.length / 2)));
      listeners.onFinal(next);
      listeners.onEnd?.();
    }
  }
  async stop() {
    this.listeners?.onEnd?.();
  }
  async abort() {
    this.listeners?.onError("aborted");
  }
}
