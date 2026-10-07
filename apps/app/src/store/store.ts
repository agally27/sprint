import { create } from "zustand";
import {
  createInitialState,
  loadState,
  reduce,
  saveState,
  type Action,
  type AppState,
} from "@sprint/core";
import { storage } from "@/platform/storage";

interface Store {
  state: AppState;
  hydrated: boolean;
  dispatch: (action: Action) => void;
  hydrate: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persistSoon(state: AppState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState(storage, state).catch(() => {
      // Storage failures must never interrupt the user. The next change retries.
    });
  }, 250);
}

/** Flush immediately, e.g. when the app goes to the background. */
export async function persistNow() {
  if (saveTimer) clearTimeout(saveTimer);
  await saveState(storage, useStore.getState().state).catch(() => {});
}

export const useStore = create<Store>((set, get) => ({
  state: createInitialState(Date.now()),
  hydrated: false,
  dispatch: (action) => {
    const next = reduce(get().state, action);
    if (next === get().state) return;
    set({ state: next });
    persistSoon(next);
  },
  hydrate: async () => {
    if (get().hydrated) return;
    const now = Date.now();
    let loaded: AppState;
    try {
      loaded = await loadState(storage, now);
    } catch {
      loaded = createInitialState(now);
    }
    const settled = reduce(loaded, { type: "app/foreground", now });
    set({ state: settled, hydrated: true });
    if (settled !== loaded) persistSoon(settled);
  },
}));

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useStore((s) => selector(s.state));
}

export function useDispatch() {
  return useStore((s) => s.dispatch);
}
