import { useQuery } from "@tanstack/react-query";
import { sobraDb } from "@/integrations/sobra-db/client";
import { buildLiveDeals } from "@/lib/deals-from-db";

/** Live deals per store; stores without any promotion in the database are simply absent. */
export function useLiveDeals() {
  return useQuery({
    queryKey: ["sobra", "live-deals"],
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const [prices, ingredients] = await Promise.all([
        sobraDb.from("product_price_today").select("*").not("ingredient_id", "is", null).limit(1000),
        sobraDb.from("ingredient").select("id, slug"),
      ]);
      if (prices.error) throw prices.error;
      if (ingredients.error) throw ingredients.error;
      return buildLiveDeals(prices.data ?? [], ingredients.data ?? []);
    },
  });
}
