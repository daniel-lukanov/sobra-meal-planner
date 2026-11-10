import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newSession, referralFrom, type ExperimentSession, type TrackFlag } from "./experiment-types";
import { saveExperimentSession } from "./experiment.functions";

export type TourState = { step: 1 | 2 | 3 | 4 | 5; sub: "guided_focus" | "step_unlocked_explore" } | "done" | null;
export const GHOST_KEY = "sobra_admin_ghost_mode";
export const isGhost = () => typeof window !== "undefined" && window.localStorage.getItem(GHOST_KEY) === "1";

type S = {
  hydrated: boolean;
  tour: TourState;
  setTour: (t: TourState) => void;
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
    // Founder ghost mode: test the app without writing anything to the study data.
    if (s && !isGhost()) saveExperimentSession({ data: s }).catch(() => {});
  }, delay);
}

export const useExp = create<S>()(
  persist(
    (set, get) => ({
      hydrated: false,
      session: null,
      skipped: false,
      tour: null,
      setTour: (tour) => set({ tour }),
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
      reset: () => set({ session: null, skipped: false, tour: null }),
    }),
    {
      name: "sobra-experiment-v2",
      skipHydration: true,
      partialize: ({ session, skipped, tour }) => ({ session, skipped, tour }),
      onRehydrateStorage: () => () => useExp.setState({ hydrated: true }),
    },
  ),
);
