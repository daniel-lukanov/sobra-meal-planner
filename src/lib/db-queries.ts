// Shared reads from our own database (public key, row level security). Cached for a few minutes by TanStack Query.
import { useQuery } from "@tanstack/react-query";
import { sobraDb } from "@/integrations/sobra-db/client";
import type { PriceRow } from "@/lib/deals-from-db";
import type { CatIngredient, CatLine, CatRecipe } from "@/lib/plan-from-db";

const opts = { staleTime: 5 * 60_000, retry: 1 } as const;

export function usePriceRows() {
  return useQuery({
    queryKey: ["sobra", "prices"], ...opts,
    queryFn: async (): Promise<PriceRow[]> => {
      const { data, error } = await sobraDb.from("product_price_today").select("*").not("ingredient_id", "is", null).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIngredients() {
  return useQuery({
    queryKey: ["sobra", "ingredients"], ...opts,
    queryFn: async (): Promise<CatIngredient[]> => {
      const { data, error } = await sobraDb.from("ingredient").select("id, slug, parent_id, base_unit, category, is_pantry_staple, name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecipes() {
  return useQuery({
    queryKey: ["sobra", "recipes"], ...opts,
    queryFn: async (): Promise<{ recipes: CatRecipe[]; lines: CatLine[] }> => {
      const [r, l] = await Promise.all([
        sobraDb.from("recipe").select("id, slug, title, servings").eq("status", "published"),
        sobraDb.from("recipe_ingredient").select("recipe_id, ingredient_id, quantity, is_optional"),
      ]);
      if (r.error) throw r.error;
      if (l.error) throw l.error;
      return { recipes: r.data ?? [], lines: l.data ?? [] };
    },
  });
}
