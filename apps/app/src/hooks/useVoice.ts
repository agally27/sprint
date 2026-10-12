import { useCallback, useEffect, useRef, useState } from "react";
import type { PermissionState, VoiceError } from "@sprint/core";
import { providers } from "@/store/providers";
import { useStore } from "@/store/store";

export interface VoiceSession {
  permission: PermissionState;
  listening: boolean;
  partial: string;
  error?: VoiceError;
  /** Request permission if needed, then listen once. */
  listen: () => Promise<void>;
  stop: () => Promise<void>;
  enabled: boolean;
}

/**
 * One place for microphone permission state, listening state and transcripts.
 * Never asks for permission twice without the user tapping again.
 */
export function useVoice(onTranscript: (text: string) => void): VoiceSession {
  const permission = useStore((s) => s.state.permissions.microphone);
  const enabled = useStore((s) => s.state.preferences.voice);
  const dispatch = useStore((s) => s.dispatch);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<VoiceError | undefined>();
  const handler = useRef(onTranscript);
  handler.current = onTranscript;

  useEffect(() => {
    let mounted = true;
    if (permission === "unknown") {
      providers.voice.getPermission().then((p) => {
        if (mounted) dispatch({ type: "permissions/set", key: "microphone", state: p });
      });
    }
    return () => {
      mounted = false;
    };
  }, [permission, dispatch]);

  const stop = useCallback(async () => {
    await providers.voice.stop();
    setListening(false);
  }, []);

  const listen = useCallback(async () => {
    setError(undefined);
    let p = permission;
    if (p === "unknown" || p === "undetermined" || p === "denied") {
      p = await providers.voice.requestPermission();
      dispatch({ type: "permissions/set", key: "microphone", state: p });
    }
    if (p !== "granted") return;
    setPartial("");
    setListening(true);
    await providers.voice.start({
      onPartial: (t) => setPartial(t),
      onFinal: (t) => {
        setPartial("");
        setListening(false);
        if (t.trim()) handler.current(t.trim());
      },
      onError: (e) => {
        setListening(false);
        setPartial("");
        if (e === "not-allowed") dispatch({ type: "permissions/set", key: "microphone", state: "blocked" });
        if (e !== "aborted") setError(e);
      },
      onEnd: () => setListening(false),
    });
  }, [permission, dispatch]);

  useEffect(
    () => () => {
      providers.voice.abort().catch(() => {});
    },
    [],
  );

  const session: VoiceSession = { permission, listening, partial, listen, stop, enabled };
  if (error) session.error = error;
  return session;
}
