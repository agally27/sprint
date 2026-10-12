/**
 * Audio abstractions. Sound is optional everywhere; every provider must be
 * replaceable with a silent one without the product noticing.
 */

export type SoundEvent = "countdown_tick" | "sprint_start" | "sprint_complete" | "milestone_complete" | "mission_complete" | "achievement";

export interface AudioProvider {
  readonly name: string;
  play(event: SoundEvent): Promise<void>;
  setEnabled(enabled: boolean): void;
}

export class SilentAudioProvider implements AudioProvider {
  readonly name = "silent";
  async play() {}
  setEnabled() {}
}

/** Text-to-speech, for spoken encouragement and the voice coach. */
export interface SpeechProvider {
  readonly name: string;
  speak(text: string, options?: { voice?: string; rate?: number }): Promise<void>;
  stop(): Promise<void>;
}

export class SilentSpeechProvider implements SpeechProvider {
  readonly name = "silent";
  async speak() {}
  async stop() {}
}

export interface MusicTrack {
  id: string;
  title: string;
  kind: "focus" | "ambient" | "energy";
  uri?: string;
}

/** Focus music / ambient sound. Future ElevenLabs or bundled assets. */
export interface MusicProvider {
  readonly name: string;
  list(): Promise<MusicTrack[]>;
  play(trackId: string): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
}

export class NoMusicProvider implements MusicProvider {
  readonly name = "none";
  async list() {
    return [] as MusicTrack[];
  }
  async play() {}
  async pause() {}
  async stop() {}
}
