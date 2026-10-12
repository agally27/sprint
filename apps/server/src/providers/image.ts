import { paletteFor, type GeneratedVisual, type MissionCategory } from "@sprint/core";
import type { Env } from "../env";

/**
 * Mission artwork. The mock returns a palette, which the app already renders
 * beautifully; a real provider returns a URL. Add one by implementing this
 * interface and switching on IMAGE_PROVIDER.
 */
export interface ImageGenProvider {
  readonly name: string;
  generate(req: { missionTitle: string; objective: string; category: MissionCategory }): Promise<GeneratedVisual>;
}

export class MockImageGenProvider implements ImageGenProvider {
  readonly name = "mock";
  async generate(req: { missionTitle: string; objective: string; category: MissionCategory }): Promise<GeneratedVisual> {
    return { provider: "mock", palette: paletteFor(req.category, req.missionTitle), prompt: req.objective, createdAt: Date.now() };
  }
}

export function createImageProvider(env: Env): ImageGenProvider | undefined {
  return env.IMAGE_PROVIDER === "mock" ? new MockImageGenProvider() : undefined;
}
