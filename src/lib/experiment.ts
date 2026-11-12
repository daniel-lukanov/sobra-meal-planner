import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyEvent, newSession, type EventName, type ExperimentSession } from "./experiment-types";
import { saveExperimentSession } from "./experiment.functions";

/** Tour steps 1 to 3 point at a feature, step 4 is the closing card. */
export type TourStep = 1 | 2 | 3 | 4;
export const GHOST_KEY = "sobra_admin_ghost_mode";
export const isGhost = () => typeof window !== "undefined" && window.localStorage.getItem(GHOST_KEY) === "1";

type S = {
  hydrated: boolean;
  tour: TourStep | null;
  tourEnded: boolean;
  feedbackOpen: boolean;
  session: ExperimentSession | null;
  setTour: (t: TourStep | null) => void;
  endTour: (how: "skipped" | "completed") => void;
  setFeedbackOpen: (v: boolean) => void;
  ensure: () => ExperimentSession;
  update: (p: Partial<ExperimentSession>, now?: boolean) => void;
  track: (e: EventName) => void;
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
      tour: null,
      tourEnded: false,
      feedbackOpen: false,
      setTour: (tour) => set({ tour }),
      endTour: (how) => { get().track(how === "skipped" ? "tour_skipped" : "tour_completed"); set({ tour: null, tourEnded: true }); },
      setFeedbackOpen: (feedbackOpen) => set({ feedbackOpen }),
      ensure: () => {
        const cur = get().session;
        if (cur) return cur;
        const s = newSession(window.location.search);
        set({ session: s });
        if (s.ref && s.utm_source === "whatsapp_share") get().track("referral_visit");
        sync(800);
        return s;
      },
      update: (p, now) => {
        const cur = get().session;
        if (!cur) return;
        set({ session: { ...cur, ...p } });
        sync(now ? 0 : 1200);
      },
      track: (e) => {
        const cur = get().session;
        if (!cur) return;
        set({ session: applyEvent(cur, e, get().tour) });
        sync(600);
      },
      reset: () => set({ session: null, tour: null, tourEnded: false }),
    }),
    {
      name: "pratico-study-v3",
      skipHydration: true,
      partialize: ({ session, tour, tourEnded }) => ({ session, tour, tourEnded }),
      onRehydrateStorage: () => () => useExp.setState({ hydrated: true }),
    },
  ),
);
