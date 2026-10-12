/**
 * Public, build-time configuration. Only EXPO_PUBLIC_* variables reach the
 * client; every secret stays on the server.
 */
export const config = {
  /** Base URL of the Sprint API. Empty means local-only mode. */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  /** "auto" uses the API when configured, "local" never calls it. */
  aiMode: (process.env.EXPO_PUBLIC_AI_MODE ?? "auto") as "auto" | "local",
  version: "0.1.0",
};

export const hasRemoteAI = config.aiMode !== "local" && config.apiUrl.length > 0;
