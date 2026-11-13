import { useMemo } from "react";
import { buildLiveDeals } from "@/lib/deals-from-db";
import { useIngredients, usePriceRows } from "@/lib/db-queries";

/** Live deals per store; stores without any promotion in the database are simply absent. */
export function useLiveDeals() {
  const prices = usePriceRows(), ings = useIngredients();
  const data = useMemo(() => (prices.data && ings.data ? buildLiveDeals(prices.data, ings.data) : undefined), [prices.data, ings.data]);
  return { data };
}
