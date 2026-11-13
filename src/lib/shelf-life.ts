// Shelf life for fridge items from the approved storage guidelines (USDA FoodKeeper, checked by a person; see db/METHODOLOGY.md).
// Rule: the short end of the range, so a date is never later than the guideline allows. Foods the guidelines do not cover keep what they had.
import type { FridgeItem } from "@/data/fridge";
import type { CatIngredient } from "@/lib/plan-from-db";
import { FRIDGE_SLUG } from "@/lib/household-data";

export type Guideline = { ingredient_id: string; location: string; min_days: number | null; max_days: number | null };
/** At or beyond half a year we say "long life" instead of counting days. */
export const LONG_LIFE_DAYS = 180;

/** Where each kind of food is normally kept: fresh food in the fridge, shelf-stable food in the cupboard. */
const preferred = (category: string) => (category === "pantry" ? ["pantry", "fridge"] : ["fridge", "pantry"]);

export function withShelfLife(items: FridgeItem[], guidelines: Guideline[], ings: CatIngredient[]): FridgeItem[] {
  const bySlug = new Map(ings.map((i) => [i.slug, i]));
  return items.map((f) => {
    const ing = bySlug.get(FRIDGE_SLUG[f.id] ?? f.id);
    if (!ing) return f;
    const rows = guidelines.filter((g) => g.ingredient_id === ing.id && g.min_days && g.max_days);
    const g = preferred(ing.category).map((loc) => rows.find((r) => r.location === loc)).find(Boolean);
    if (!g?.min_days || !g.max_days) return f;
    return { ...f, daysLeft: g.min_days >= LONG_LIFE_DAYS ? null : g.min_days, maxDays: g.max_days };
  });
}
