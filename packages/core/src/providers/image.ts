import type { GeneratedVisual, MissionCategory } from "../domain/types";

export interface ImageRequest {
  missionTitle: string;
  objective: string;
  category: MissionCategory;
}

/** Mission artwork. Optional; the mock gives every mission a palette instead. */
export interface ImageProvider {
  readonly name: string;
  generate(req: ImageRequest, signal?: AbortSignal): Promise<GeneratedVisual>;
}

const PALETTES: Record<MissionCategory, Array<[string, string]>> = {
  work: [
    ["#FF6B3D", "#FFB36B"],
    ["#FF7A59", "#F9C784"],
  ],
  health: [
    ["#3DDC97", "#7AE7C7"],
    ["#38C9A8", "#A8F0D2"],
  ],
  personal: [
    ["#5BA8FF", "#9CD0FF"],
    ["#4F8DF5", "#B5D7FF"],
  ],
  learning: [
    ["#F2C14E", "#FFE39A"],
    ["#E8B13C", "#FFD98A"],
  ],
  creative: [
    ["#F26D85", "#FFB3C0"],
    ["#E85D75", "#FFC2CE"],
  ],
  finance: [
    ["#4FD1C5", "#B2F5EA"],
    ["#38B2AC", "#A6EDE6"],
  ],
  home: [
    ["#C8A27A", "#EAD7BF"],
    ["#B88E63", "#E6CFB3"],
  ],
  other: [
    ["#9AA3B2", "#D5DAE3"],
    ["#8893A3", "#CCD3DD"],
  ],
};

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function paletteFor(category: MissionCategory, seed: string): [string, string] {
  const options = PALETTES[category] ?? PALETTES.other;
  return options[hashSeed(seed) % options.length] ?? ["#9AA3B2", "#D5DAE3"];
}

/** No network, no keys. A deterministic palette gives every mission an identity. */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  constructor(private readonly now: () => number = () => Date.now()) {}
  async generate(req: ImageRequest): Promise<GeneratedVisual> {
    return { provider: "mock", palette: paletteFor(req.category, req.missionTitle), prompt: req.objective, createdAt: this.now() };
  }
}
