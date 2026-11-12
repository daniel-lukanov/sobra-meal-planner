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
  fridge: FridgeItem[];
  alerts: Record<string, boolean>;
  pick: string;
  /** Day row index to the dinner title picked through Swap. */
  chosen: Record<string, string>;
  addedDeals: string[];
  /** Ingredients the tester confirmed they already have for tonight. */
  have: string[];
  people: number;
  checked: Record<string, boolean>;
  set: (p: Partial<State>) => void;
};

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
      fridge: initialFridge,
      alerts: { potatoes: true, chicken: false, eggs: true },
      pick: "rice",
      chosen: {},
      addedDeals: [],
      have: [],
      people: 2,
      checked: {},
      set: (p) => set(p),
    }),
    {
      name: "pratico-app-v2",
      skipHydration: true,
      partialize: ({ hydrated: _h, set: _s, ...rest }) => rest,
      onRehydrateStorage: () => () => useApp.setState({ hydrated: true }),
    },
  ),
);

export const eur = (n: number) => `€${n.toFixed(2)}`;
