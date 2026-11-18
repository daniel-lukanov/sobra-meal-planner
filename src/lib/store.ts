import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialFridge, type FridgeItem, type Receipt } from "@/data/fridge";
import type { StoreName } from "@/data/stores";
import { DEFAULT_PREFS, dietToPrefs, type Lifestyle } from "@/lib/prefs";

export type Mode = "prep" | "daily";

type State = {
  hydrated: boolean;
  setupDone: boolean;
  /** Supermarkets the household shops at. Each ingredient is priced at the cheapest of them. */
  stores: StoreName[];
  mode: Mode;
  lifestyle: Lifestyle;
  /** Animal proteins the person eats (codes from prefs.ts). */
  proteins: string[];
  /** Allergens and intolerances to avoid (codes from prefs.ts). A dinner containing one is never shown. */
  allergens: string[];
  goals: string[];
  meals: string[];
  weekAccepted: boolean;
  fridge: FridgeItem[];
  /** Receipts the tester added. Their items live in `fridge` with the receipt id. */
  receipts: Receipt[];
  alerts: Record<string, boolean>;
  pick: string;
  /** Day row index to the dinner title picked through Swap. */
  chosen: Record<string, string>;
  addedDeals: string[];
  /** Ingredients (slugs) the person said they already have at home. They leave the shopping list. */
  have: string[];
  /** Daily pick: tonight's dinner (recipe title) and the day it was picked for (yyyy-mm-dd). */
  today: { date: string; title: string } | null;
  /** The account this browser's data was last matched with, so a returning login is not asked which data to keep. */
  syncedFor: string | null;
  people: number;
  checked: Record<string, boolean>;
  set: (p: Partial<State>) => void;
};

export const useApp = create<State>()(
  persist(
    (set) => ({
      hydrated: false,
      setupDone: false,
      stores: ["Pingo Doce"],
      mode: "prep",
      lifestyle: DEFAULT_PREFS.lifestyle,
      proteins: DEFAULT_PREFS.proteins,
      allergens: [],
      goals: [],
      meals: ["Tortilla", "Curry", "Rice bowls", "Pasta", "Roast chicken", "Potato salad"],
      weekAccepted: false,
      fridge: initialFridge,
      receipts: [],
      alerts: { potatoes: true, chicken: false, eggs: true },
      pick: "rice",
      chosen: {},
      addedDeals: [],
      have: [],
      today: null,
      syncedFor: null,
      people: 2,
      checked: {},
      set: (p) => set(p),
    }),
    {
      name: "pratico-app-v2",
      version: 1,
      // Version 0 saved one `store` and a `diet` word list.
      migrate: (old, version) => {
        const o = (old ?? {}) as Record<string, unknown>;
        if (version < 1) {
          const { store, diet, ...rest } = o as { store?: StoreName; diet?: string[] } & Record<string, unknown>;
          return { ...rest, stores: store ? [store] : ["Pingo Doce"], ...dietToPrefs(diet ?? ["Meat", "Fish"]) } as unknown as State;
        }
        return o as unknown as State;
      },
      skipHydration: true,
      partialize: ({ hydrated: _h, set: _s, ...rest }) => rest,
      onRehydrateStorage: () => () => useApp.setState({ hydrated: true }),
    },
  ),
);

export const eur = (n: number) => `€${n.toFixed(2)}`;

/** The person's food settings as one object, for the planner. */
export const prefsOf = (s: Pick<State, "lifestyle" | "proteins" | "allergens" | "goals">) => ({ lifestyle: s.lifestyle, proteins: s.proteins, allergens: s.allergens, goals: s.goals });
/** "Pingo Doce", "Pingo Doce and Lidl", "Pingo Doce, Lidl and Aldi". */
export const storesLabel = (list: string[]) => (list.length <= 1 ? (list[0] ?? "your supermarket") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`);
