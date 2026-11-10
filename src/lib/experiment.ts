import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newSession, referralFrom, type ExperimentSession, type TrackFlag } from "./experiment-types";
import { saveExperimentSession } from "./experiment.functions";

type S = {
  hydrated: boolean;
  session: ExperimentSession | null;
  skipped: boolean;
  ensure: () => ExperimentSession;
  update: (p: Partial<ExperimentSession>, now?: boolean) => void;
  track: (flag: TrackFlag) => void;
  skip: () => void;
  reset: () => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;
function sync(delay: number) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const s = useExp.getState().session;
    // localStorage already holds the session, so a failed save loses nothing locally.
    if (s) saveExperimentSession({ data: s }).catch(() => {});
  }, delay);
}

export const useExp = create<S>()(
  persist(
    (set, get) => ({
      hydrated: false,
      session: null,
      skipped: false,
      ensure: () => {
        const cur = get().session;
        if (cur) return cur;
        const s = newSession(referralFrom(window.location.search));
        set({ session: s });
        sync(800);
        return s;
      },
      update: (p, now) => {
        const cur = get().session;
        if (!cur) return;
        set({ session: { ...cur, ...p } });
        sync(now ? 0 : 1200);
      },
      track: (flag) => {
        const cur = get().session;
        if (!cur || cur[flag]) return;
        get().update({ [flag]: true });
      },
      skip: () => set({ skipped: true }),
      reset: () => set({ session: null, skipped: false }),
    }),
    {
      name: "sobra-experiment-v2",
      skipHydration: true,
      partialize: ({ session, skipped }) => ({ session, skipped }),
      onRehydrateStorage: () => () => useExp.setState({ hydrated: true }),
    },
  ),
);
