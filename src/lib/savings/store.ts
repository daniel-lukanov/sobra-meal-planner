import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Line } from "./engine";
import type { SavingsStore } from "./prices";

export type Path = "receipt" | "manual" | "demo";
type S = {
  hydrated: boolean;
  path: Path | null;
  store: SavingsStore | null;
  lines: Line[];
  /** Manual path answers. */
  picks: string[];
  usualStore: SavingsStore | null;
  /** Receipt, date and place shown on the paper card. */
  receiptMeta: { place: string; date: string; time: string } | null;
  /** Not persisted: the last photo could not be read / the list just opened is the second one this week. */
  failed: boolean;
  listBlocked: boolean;
  /** The survey pop-over was closed with Later; from then on a bar at the bottom invites them instead. */
  promptDismissed: boolean;
  set: (p: Partial<Omit<S, "set" | "reset" | "hydrated">>) => void;
  reset: () => void;
};
const blank = { path: null, store: null, lines: [], picks: [], usualStore: null, receiptMeta: null, failed: false, listBlocked: false, promptDismissed: false };

export const useSavings = create<S>()(
  persist(
    (set) => ({ hydrated: false, ...blank, set: (p) => set(p), reset: () => set({ ...blank }) }),
    {
      name: "pratico-savings-v1",
      skipHydration: true,
      partialize: ({ path, store, lines, picks, usualStore, receiptMeta, promptDismissed }) => ({ path, store, lines, picks, usualStore, receiptMeta, promptDismissed }),
      onRehydrateStorage: () => () => useSavings.setState({ hydrated: true }),
    },
  ),
);
