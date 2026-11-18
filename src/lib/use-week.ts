// The week the screens show. Built from database recipes when enough are available, otherwise the sample week.
import { useMemo } from "react";
import { useApp, prefsOf } from "@/lib/store";
import { CHAIN_OF } from "@/lib/deals-from-db";
import { useIngredients, usePriceRows, useRecipeDetails, useRecipes } from "@/lib/db-queries";
import { recipeCost, type Catalog } from "@/lib/plan-from-db";
import { buildPool, planWeek } from "@/lib/recipe-pool";
import { combinePrefs, fitsPrefs } from "@/lib/prefs";
import { useHousemates } from "@/lib/household-prefs";
import { EMPTY_CTX, buildWeek, weekCards, type WeekCtx } from "@/lib/week";

export type WeekStatus = "loading" | "error" | "ready" | "none";

/** `none`: data loaded but no dinner fits the person's diet and allergies. `short`: fewer than 6 fit, so the week is shorter. */
export function useWeek() {
  const app = useApp();
  const { stores, people, chosen } = app;
  // Housemates share the plan: it respects the strictest diet and every allergy among them.
  const mates = useHousemates();
  const own = useMemo(() => prefsOf(app), [app.lifestyle, app.proteins, app.allergens, app.goals]); // eslint-disable-line react-hooks/exhaustive-deps
  const prefs = useMemo(() => (mates.length ? combinePrefs([own, ...mates]) : own), [own, mates]);
  const meals = useMemo(() => (mates.length ? [...new Set([...app.meals, ...mates.flatMap((m) => m.meals)])] : app.meals), [app.meals, mates]);
  const prices = usePriceRows(), ings = useIngredients(), recipes = useRecipes(), details = useRecipeDetails();
  const chains = useMemo(() => stores.map((s) => CHAIN_OF[s]), [stores]);
  const failed = prices.isError || ings.isError || recipes.isError || details.isError;
  const ctx = useMemo<WeekCtx & { live: boolean; status: WeekStatus; fitting: number }>(() => {
    if (!prices.data || !ings.data || !recipes.data || !details.data) return { ...EMPTY_CTX, live: false, status: failed ? "error" : "loading", fitting: 0 };
    const pool = buildPool({ recipes: details.data.recipes, lines: recipes.data.lines, ingredients: ings.data, flags: details.data.flags, tags: details.data.tags, allergens: details.data.allergens });
    const cat: Catalog = { ingredients: ings.data, recipes: recipes.data.recipes, lines: recipes.data.lines, prices: prices.data };
    // Price each dinner at the cheapest of the household's stores; a dinner with no price anywhere keeps a placeholder.
    const priced = new Set<string>();
    for (const m of pool) { const c = recipeCost(cat, m.title, chains, people); if (c !== null) { m.price = c; priced.add(m.title); } }
    const plan = planWeek(pool, { prefs, types: meals, priced: (m) => priced.has(m.title), cheaper: (m) => m.price });
    const fitting = pool.filter((m) => fitsPrefs(m, prefs)).length;
    return { plan, pool, live: true, status: plan.length === 0 ? "none" : "ready", fitting };
  }, [prices.data, ings.data, recipes.data, details.data, failed, chains, people, prefs, meals]);
  const chapters = useMemo(() => buildWeek(chosen, ctx), [chosen, ctx]);
  const cards = useMemo(() => weekCards(chosen, ctx), [chosen, ctx]);
  return { ctx, chapters, cards, status: ctx.status, prefs, fitting: ctx.fitting };
}
