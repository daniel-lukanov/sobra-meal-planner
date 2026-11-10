import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialFridge, type FridgeItem } from "@/data/fridge";
import type { StoreName } from "@/data/stores";

export type Mode = "prep" | "daily";

type State = {
  hydrated: boolean;
  setupDone: boolean;
  store: StoreName;
  mode: Mode;
  diet: string[];
  meals: string[];
  weekAccepted: boolean;
  savingsWeek: number;
  savingsMonth: number;
  fridge: FridgeItem[];
  alerts: Record<string, boolean>;
  pick: string;
  swaps: Record<number, number>;
  reelAdded: boolean;
  checked: Record<string, boolean>;
  set: (p: Partial<State>) => void;
  addSavings: (amount: number) => void;
};

const round = (n: number) => Math.round(n * 100) / 100;

export const useApp = create<State>()(
  persist(
    (set) => ({
      hydrated: false,
      setupDone: false,
      store: "Pingo Doce",
      mode: "prep",
      diet: ["Meat", "Fish"],
      meals: ["Tortilla", "Curry", "Rice bowls", "Pasta", "Roast chicken", "Potato salad"],
      weekAccepted: false,
      savingsWeek: 18.4,
      savingsMonth: 61.2,
      fridge: initialFridge,
      alerts: { potatoes: true, chicken: false, eggs: true },
      pick: "rice",
      swaps: {},
      reelAdded: false,
      checked: {},
      set: (p) => set(p),
      addSavings: (amount) =>
        set((s) => ({ savingsWeek: round(s.savingsWeek + amount), savingsMonth: round(s.savingsMonth + amount) })),
    }),
    {
      name: "sobra-v1",
      skipHydration: true,
      partialize: ({ hydrated: _h, set: _s, addSavings: _a, ...rest }) => rest,
      onRehydrateStorage: () => () => useApp.setState({ hydrated: true }),
    },
  ),
);

export const eur = (n: number) => `€${n.toFixed(2)}`;
