// Deals from our own database (view product_price_today), shaped like the sample deals the screen already uses.
// A deal counts as real only when it beats the cheapest REGULAR price for the same ingredient, compared per usable gram,
// millilitre or piece across every product of the same kind and chain we know (see db/README.md, net weight).
import type { Database } from "@/integrations/sobra-db/types";
import type { Deal } from "@/data/deals";
import type { IngredientId } from "@/data/ingredients";
import type { StoreName } from "@/data/stores";

export type PriceRow = Database["public"]["Views"]["product_price_today"]["Row"];
export type IngredientRef = { id: string; slug: string };

export const CHAIN_OF: Record<StoreName, string> = {
  "Pingo Doce": "pingo-doce", Continente: "continente", Lidl: "lidl", Aldi: "aldi", Auchan: "auchan",
};
const KNOWN: IngredientId[] = ["potatoes", "chicken", "onion", "carrots", "eggs", "rice", "chickpeas", "peppers", "tuna", "spinach"];
export const MAX_DEALS_PER_STORE = 12;

/**
 * Products are only compared with the same kind: organic against organic, extra virgin against extra virgin, fillets against fillets.
 * Otherwise the cheapest plain product makes every premium deal look like a trap.
 */
export function variantKey(name: string): string {
  const n = name.toLowerCase();
  const tags: string[] = [];
  if (/\bbio(l[óo]gic[oa])?\b/.test(n)) tags.push("bio");
  if (/virgem extra/.test(n)) tags.push("virgem-extra"); else if (/virgem/.test(n)) tags.push("virgem");
  if (/\b(dop|igp)\b/.test(n)) tags.push("dop");
  if (/integral/.test(n)) tags.push("integral");
  if (/sem gl[úu]ten/.test(n)) tags.push("sem-gluten");
  if (/(tricolor|picante|quadri|tinta|nero|espelta|aveia|molde)/.test(n)) tags.push("special");
  if (/(campo|ar livre|solo)/.test(n)) tags.push("free-range");
  if (/(filete|ventresca|lombo)/.test(n)) tags.push("fillet");
  const grain = n.match(/\b(agulha|carolino|basmati|vaporizado|jasmim|risotto|arb[óo]reo|sushi|selvagem|redondo)\b/);
  if (grain?.[1]) tags.push(grain[1]);
  return tags.sort().join("+");
}
const groupKey = (ingredientId: string, name: string) => `${ingredientId}|${variantKey(name)}`;

const round2 = (n: number) => Math.round(n * 100) / 100;
export function formatPack(qty: number, unit: string): string {
  if (unit === "g") return qty >= 1000 ? `${qty / 1000} kg` : `${qty} g`;
  if (unit === "ml") return qty >= 1000 ? `${qty / 1000} l` : `${qty} ml`;
  return `${qty} un`;
}

export function buildLiveDeals(rows: PriceRow[], ingredients: IngredientRef[]): Partial<Record<StoreName, Deal[]>> {
  const slugOf = new Map(ingredients.map((i) => [i.id, i.slug]));
  // cheapest regular price per usable unit, per ingredient and kind, over all chains
  const cheapestRegularPerUnit = new Map<string, number>();
  const usableOf = (r: PriceRow) => (r.effective_price && r.price_per_base_unit ? r.effective_price / r.price_per_base_unit : null);
  for (const r of rows) {
    const u = usableOf(r);
    if (!r.ingredient_id || !r.regular_price || !u || !r.name) continue;
    const perUnit = r.regular_price / u, key = groupKey(r.ingredient_id, r.name);
    const cur = cheapestRegularPerUnit.get(key);
    if (cur === undefined || perUnit < cur) cheapestRegularPerUnit.set(key, perUnit);
  }
  const out: Partial<Record<StoreName, Deal[]>> = {};
  for (const [store, chainId] of Object.entries(CHAIN_OF) as [StoreName, string][]) {
    const deals: Deal[] = [];
    for (const r of rows) {
      if (r.chain_id !== chainId || !r.ingredient_id || r.promo_price == null || r.regular_price == null || r.name == null) continue;
      if (!(r.promo_price < r.regular_price)) continue;
      const u = usableOf(r);
      const best = cheapestRegularPerUnit.get(groupKey(r.ingredient_id, r.name));
      const slug = slugOf.get(r.ingredient_id) ?? "";
      deals.push({
        ...(r.product_id ? { id: r.product_id } : {}),
        name: `${r.name_en ?? r.name} ${formatPack(Number(r.pack_qty), r.pack_unit ?? "g")}`,
        ingredient: (KNOWN as string[]).includes(slug) ? (slug as IngredientId) : null,
        price: r.promo_price, was: r.regular_price,
        cheapestRegular: u && best !== undefined ? round2(best * u) : r.regular_price,
        ...(r.promo_ends_on ? { endsOn: r.promo_ends_on } : {}), photoKey: slug.replace(/-/g, " "),
      });
    }
    deals.sort((a, b) => (b.cheapestRegular - b.price) - (a.cheapestRegular - a.price));
    if (deals.length) out[store] = deals.slice(0, MAX_DEALS_PER_STORE);
  }
  return out;
}

