// Prices and shopping list for the plan screens: from our own database when the chosen store has data for the week's
// dinners, otherwise the sample numbers the prototype already had.
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { CHAIN_OF } from "@/lib/deals-from-db";
import { useIngredients, usePriceRows, useRecipes } from "@/lib/db-queries";
import { allPriced, buildShoppingList, recipeCost, type Catalog } from "@/lib/plan-from-db";
import type { Meal } from "@/data/plan";
import { neededItems, weekTotal, type Card, type NeededItem } from "@/lib/week";

// Fridge item ids that differ from the ingredient slugs in the database.
const FRIDGE_SLUG: Record<string, string> = { onions: "onion" };
const r2 = (n: number) => Math.round(n * 100) / 100;

export function useLivePlan() {
  const { store, people, fridge } = useApp();
  const inFridge = useMemo(() => new Set(fridge.map((f) => FRIDGE_SLUG[f.id] ?? f.id)), [fridge]);
  const prices = usePriceRows(), ings = useIngredients(), recipes = useRecipes();
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
        if (!cat || !isLive(cards)) return neededItems(cards);
        return buildShoppingList(cat, cards.map((c) => c.meal.title), chainId, people).map((l) => ({
          id: l.id, name: l.name, price: l.price, aisle: l.aisle, dinners: l.dinners, ...(inFridge.has(l.id) ? { inFridge: true } : {}),
        }));
      },
      planNote: (cards: Card[]) => (isLive(cards) ? `Prices from ${store}'s website: the share of each pack your dinners use. Check the shelf before you buy.` : "Sample prices, no guarantee."),
      listNote: (cards: Card[]) => (isLive(cards) ? `Prices from ${store}'s website, whole packs. Check the shelf before you buy.` : "Sample prices, no guarantee."),
    };
  }, [cat, chainId, people, store, inFridge]);
}
