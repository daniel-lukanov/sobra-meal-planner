// The week the screens show. Built from database recipes when enough are available, otherwise the sample week.
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { CHAIN_OF } from "@/lib/deals-from-db";
import { useIngredients, usePriceRows, useRecipeDetails, useRecipes } from "@/lib/db-queries";
import { recipeCost, type Catalog } from "@/lib/plan-from-db";
import { buildPool, planWeek } from "@/lib/recipe-pool";
import { STATIC_CTX, buildWeek, weekCards, type WeekCtx } from "@/lib/week";

export function useWeek() {
  const { store, people, diet, meals, chosen } = useApp();
  const prices = usePriceRows(), ings = useIngredients(), recipes = useRecipes(), details = useRecipeDetails();
  const chainId = CHAIN_OF[store];
  const ctx = useMemo<WeekCtx & { live: boolean }>(() => {
    if (!prices.data || !ings.data || !recipes.data || !details.data) return { ...STATIC_CTX, live: false };
    const pool = buildPool({ recipes: details.data.recipes, lines: recipes.data.lines, ingredients: ings.data, flags: details.data.flags, tags: details.data.tags });
    const cat: Catalog = { ingredients: ings.data, recipes: recipes.data.recipes, lines: recipes.data.lines, prices: prices.data };
    // Price each dinner at the chosen store when it can be priced there; otherwise keep the sample figure.
    const priced = new Set<string>();
    for (const m of pool) { const c = recipeCost(cat, m.title, chainId, people); if (c !== null) { m.price = c; priced.add(m.title); } }
    const plan = planWeek(pool, { diet, types: meals, priced: (m) => priced.has(m.title) });
    return plan ? { plan, pool, live: true } : { ...STATIC_CTX, live: false };
  }, [prices.data, ings.data, recipes.data, details.data, chainId, people, diet, meals]);
  const chapters = useMemo(() => buildWeek(chosen, ctx), [chosen, ctx]);
  const cards = useMemo(() => weekCards(chosen, ctx), [chosen, ctx]);
  return { ctx, chapters, cards };
}
