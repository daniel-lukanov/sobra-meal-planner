// Prices and shopping list for the plan screens: from our own database when the chosen store has data for the week's
// dinners, otherwise the sample numbers the prototype already had.
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { CHAIN_OF } from "@/lib/deals-from-db";
import { formatAmount } from "@/lib/amounts";
import { FRIDGE_SLUG } from "@/lib/household-data";
import { useIngredients, usePriceRows, useRecipes } from "@/lib/db-queries";
import { allPriced, buildShoppingList, recipeCost, weekNeed, type Catalog, type Have } from "@/lib/plan-from-db";
import type { Meal } from "@/data/plan";
import { neededItems, weekTotal, type Card, type NeededItem } from "@/lib/week";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function useLivePlan() {
  const { store, people, fridge } = useApp();
  const prices = usePriceRows(), ings = useIngredients(), recipes = useRecipes();
  // Amounts per ingredient id, summed over the fridge; an item without an amount (older entries, prepared food) counts as enough.
  const have = useMemo<Have>(() => {
    const bySlug = new Map((ings.data ?? []).map((i) => [i.slug, i.id]));
    const m: Have = new Map();
    for (const f of fridge) {
      const id = bySlug.get(FRIDGE_SLUG[f.id] ?? f.id);
      if (!id) continue;
      const prev = m.get(id);
      m.set(id, f.qty === undefined || prev === null ? null : (prev ?? 0) + f.qty);
    }
    return m;
  }, [fridge, ings.data]);
  const inFridge = useMemo(() => new Set(fridge.map((f) => FRIDGE_SLUG[f.id] ?? f.id)), [fridge]);
  const cat = useMemo<Catalog | null>(() => (prices.data && ings.data && recipes.data
    ? { ingredients: ings.data, recipes: recipes.data.recipes, lines: recipes.data.lines, prices: prices.data } : null), [prices.data, ings.data, recipes.data]);
  const chainId = CHAIN_OF[store];

  return useMemo(() => {
    const livePrice = (m: Meal) => (cat ? recipeCost(cat, m.title, chainId, people) : null);
    const isLive = (cards: Card[]) => !!cat && cards.length > 0 && allPriced(cat, cards.map((c) => c.meal.title), chainId, people);
    return {
      /** Price of one dinner for the household. */
      priceOf: (m: Meal) => livePrice(m) ?? m.price,
      isLive,
      weekTotal: (cards: Card[]) => (isLive(cards) ? r2(cards.reduce((a, c) => a + (livePrice(c.meal) ?? c.meal.price), 0)) : weekTotal(cards)),
      items: (cards: Card[]): NeededItem[] => {
        if (!cat || !isLive(cards)) {
          // Sample list: same rule, "in fridge" follows the real fridge and not the prototype's fixed flags.
          return neededItems(cards).map(({ inFridge: _sample, ...it }) => ({ ...it, ...(inFridge.has(it.id) ? { inFridge: true } : {}) }));
        }
        return buildShoppingList(cat, cards.map((c) => c.meal.title), chainId, people, have).map((l) => ({
          id: l.id, name: l.name, price: l.price, aisle: l.aisle, dinners: l.dinners, ...(l.covered ? { inFridge: true } : {}),
          ...(!l.covered && l.have > 0 && Number.isFinite(l.have) ? { note: `You have ${formatAmount(l.have, l.unit)} of the ${formatAmount(l.need, l.unit)} needed` } : {}),
        }));
      },
      /** What this week's dinners need of one ingredient (by slug), in its base unit; null until prices and recipes are loaded. */
      needOf: (slug: string, cards: Card[]): number | null => {
        const ing = cat?.ingredients.find((i) => i.slug === slug);
        return cat && ing ? weekNeed(cat, ing.id, cards.map((c) => c.meal.title), people) : null;
      },
      planNote: (cards: Card[]) => (isLive(cards) ? `Prices from ${store}'s website: the share of each pack your dinners use. Check the shelf before you buy.` : "Sample prices, no guarantee."),
      listNote: (cards: Card[]) => (isLive(cards) ? `Prices from ${store}'s website, whole packs. Check the shelf before you buy.` : "Sample prices, no guarantee."),
    };
  }, [cat, chainId, people, store, inFridge, have]);
}
