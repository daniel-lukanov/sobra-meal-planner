// Shared reads from our own database (public key, row level security). Cached for a few minutes by TanStack Query.
import { useQuery } from "@tanstack/react-query";
import { praticoDb } from "@/integrations/pratico-db/client";
import type { PriceRow } from "@/lib/deals-from-db";
import type { CatIngredient, CatLine, CatRecipe } from "@/lib/plan-from-db";
import type { DbFlags, DbRecipe } from "@/lib/recipe-pool";

const opts = { staleTime: 5 * 60_000, retry: 1 } as const;

export function usePriceRows() {
  return useQuery({
    queryKey: ["pratico", "prices"], ...opts,
    queryFn: async (): Promise<PriceRow[]> => {
      const { data, error } = await praticoDb.from("product_price_today").select("*").not("ingredient_id", "is", null).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIngredients() {
  return useQuery({
    queryKey: ["pratico", "ingredients"], ...opts,
    queryFn: async (): Promise<CatIngredient[]> => {
      const { data, error } = await praticoDb.from("ingredient").select("id, slug, parent_id, base_unit, category, is_pantry_staple, name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecipes() {
  return useQuery({
    queryKey: ["pratico", "recipes"], ...opts,
    queryFn: async (): Promise<{ recipes: CatRecipe[]; lines: CatLine[] }> => {
      const [r, l] = await Promise.all([
        praticoDb.from("recipe").select("id, slug, title, servings").eq("status", "published"),
        praticoDb.from("recipe_ingredient").select("recipe_id, ingredient_id, quantity, is_optional"),
      ]);
      if (r.error) throw r.error;
      if (l.error) throw l.error;
      return { recipes: r.data ?? [], lines: l.data ?? [] };
    },
  });
}

/** Approved shelf-life guidelines only (row level security hides the rest). */
export function useStorageGuidelines() {
  return useQuery({
    queryKey: ["pratico", "storage"], ...opts,
    queryFn: async () => {
      const { data, error } = await praticoDb.from("storage_guideline").select("ingredient_id, location, min_days, max_days").eq("state", "raw");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Everything a dinner needs beyond cost: meal type, how, steps, summary, diet flags and tags. */
export function useRecipeDetails() {
  return useQuery({
    queryKey: ["pratico", "recipe-details"], ...opts,
    queryFn: async (): Promise<{ recipes: DbRecipe[]; flags: DbFlags[]; tags: { recipe_id: string; tag: string }[]; allergens: { recipe_id: string; allergen_code: string }[] }> => {
      const [r, f, t, a] = await Promise.all([
        praticoDb.from("recipe").select("id, slug, title, meal_type, summary, how, minutes, image_url, steps_relaxed, steps_fast").eq("status", "published"),
        praticoDb.from("recipe_diet_flags").select("recipe_id, has_pork, has_beef, has_poultry, has_other_meat, has_fish, has_shellfish, has_dairy, has_egg"),
        praticoDb.from("recipe_tag").select("recipe_id, tag"),
        praticoDb.from("recipe_allergen").select("recipe_id, allergen_code"),
      ]);
      if (a.error) throw a.error;
      if (r.error) throw r.error;
      if (f.error) throw f.error;
      if (t.error) throw t.error;
      return { recipes: (r.data ?? []) as DbRecipe[], flags: (f.data ?? []) as DbFlags[], tags: t.data ?? [], allergens: (a.data ?? []).flatMap((x) => (x.recipe_id && x.allergen_code ? [{ recipe_id: x.recipe_id, allergen_code: x.allergen_code }] : [])) };
    },
  });
}
