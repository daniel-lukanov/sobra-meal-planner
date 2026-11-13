// Costs and the shopping list from our own database (pure logic, tested in src/test/plan-from-db.test.ts).
//  - A recipe costs what its ingredients cost per usable gram, millilitre or piece at the chosen store (share of a pack).
//  - A shopping list buys whole packs: for each ingredient the cheapest way to cover the quantity the week needs.
// Pantry staples (oil, salt) are left out of both, as in the database view recipe_cost_today.
import type { PriceRow } from "@/lib/deals-from-db";
import { formatPack } from "@/lib/deals-from-db";

export type CatIngredient = { id: string; slug: string; parent_id: string | null; base_unit: string; category: string; is_pantry_staple: boolean; name: string };
export type CatRecipe = { id: string; slug: string; title: string; servings: number };
export type CatLine = { recipe_id: string; ingredient_id: string; quantity: number; is_optional: boolean };
export type Catalog = { ingredients: CatIngredient[]; recipes: CatRecipe[]; lines: CatLine[]; prices: PriceRow[] };

/** `covered`: the fridge already holds everything this ingredient needs, so there is nothing to buy. */
export type ListLine = { id: string; name: string; price: number | null; aisle: string; dinners: number; packs: number; covered: boolean };
/** What the fridge holds, by ingredient id: an amount in the ingredient's base unit, or null when the amount is not known (counts as enough). */
export type Have = Map<string, number | null>;

const AISLE: Record<string, string> = { fruit_veg: "Fruit and veg", meat_fish: "Meat and fish", eggs_dairy: "Eggs and dairy", pantry: "Pantry" };
const r2 = (n: number) => Math.round(n * 100) / 100;

const usableOf = (r: PriceRow): number | null => (r.effective_price && r.price_per_base_unit ? r.effective_price / r.price_per_base_unit : null);

/** Products of an ingredient at one chain; children count for their parent (chicken thighs for chicken), in the parent's unit only. */
function productsFor(cat: Catalog, ing: CatIngredient, chainId: string): PriceRow[] {
  const ids = new Set([ing.id, ...cat.ingredients.filter((i) => i.parent_id === ing.id).map((i) => i.id)]);
  return cat.prices.filter((p) => p.chain_id === chainId && p.ingredient_id && ids.has(p.ingredient_id) && p.pack_unit === ing.base_unit && p.effective_price != null && usableOf(p));
}

export function cheapestUnitPrice(cat: Catalog, ing: CatIngredient, chainId: string): number | null {
  let best: number | null = null;
  for (const p of productsFor(cat, ing, chainId)) if (p.price_per_base_unit != null && (best === null || p.price_per_base_unit < best)) best = p.price_per_base_unit;
  return best;
}

const recipeByTitle = (cat: Catalog, title: string) => cat.recipes.find((r) => r.title === title);
const linesOf = (cat: Catalog, recipeId: string) => cat.lines.filter((l) => l.recipe_id === recipeId && !l.is_optional);
const ingById = (cat: Catalog, id: string) => cat.ingredients.find((i) => i.id === id);

/** Cost of one dinner for `people`, or null when some ingredient has no price at this chain. */
export function recipeCost(cat: Catalog, title: string, chainId: string, people: number): number | null {
  const r = recipeByTitle(cat, title);
  if (!r) return null;
  const scale = people / Math.max(1, r.servings);
  let total = 0;
  for (const l of linesOf(cat, r.id)) {
    const ing = ingById(cat, l.ingredient_id);
    if (!ing || ing.is_pantry_staple) continue;
    const unit = cheapestUnitPrice(cat, ing, chainId);
    if (unit === null) return null;
    total += l.quantity * scale * unit;
  }
  return r2(total);
}

/** The cheapest way to buy at least `need` of an ingredient: whole packs of one product. */
export function cheapestPacks(cat: Catalog, ing: CatIngredient, chainId: string, need: number): { row: PriceRow; packs: number; cost: number } | null {
  let best: { row: PriceRow; packs: number; cost: number } | null = null;
  for (const row of productsFor(cat, ing, chainId)) {
    const usable = usableOf(row);
    if (!usable || row.effective_price == null) continue;
    const packs = Math.max(1, Math.ceil(need / usable - 1e-9));
    const cost = packs * row.effective_price;
    if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && packs < best.packs)) best = { row, packs, cost };
  }
  return best ? { ...best, cost: r2(best.cost) } : null;
}

/** Amount of this ingredient in the fridge (its own entries and its parent's, so "chicken" covers thighs). Infinity when an amount is unknown. */
function haveOf(have: Have, ing: CatIngredient): number {
  let sum = 0;
  for (const id of [ing.id, ing.parent_id]) {
    if (!id || !have.has(id)) continue;
    const q = have.get(id);
    if (q === null || q === undefined) return Infinity;
    sum += q;
  }
  return sum;
}

/** Shopping list for the dinners (by recipe title), without pantry staples. Ingredients without a price stay on the list with no price. */
export function buildShoppingList(cat: Catalog, titles: string[], chainId: string, people: number, have: Have = new Map()): ListLine[] {
  const need = new Map<string, number>(), dinners = new Map<string, number>();
  for (const t of titles) {
    const r = recipeByTitle(cat, t);
    if (!r) continue;
    const scale = people / Math.max(1, r.servings);
    for (const l of linesOf(cat, r.id)) {
      const ing = ingById(cat, l.ingredient_id);
      if (!ing || ing.is_pantry_staple) continue;
      need.set(ing.id, (need.get(ing.id) ?? 0) + l.quantity * scale);
      dinners.set(ing.id, (dinners.get(ing.id) ?? 0) + 1);
    }
  }
  const out: ListLine[] = [];
  for (const [id, qty] of need) {
    const ing = ingById(cat, id)!;
    const aisle = AISLE[ing.category] ?? "Pantry";
    const left = qty - haveOf(have, ing);
    if (left <= 1e-9) { out.push({ id: ing.slug, name: ing.name, price: null, aisle, dinners: dinners.get(id) ?? 0, packs: 0, covered: true }); continue; }
    const pick = cheapestPacks(cat, ing, chainId, left);
    if (!pick) { out.push({ id: ing.slug, name: ing.name, price: null, aisle, dinners: dinners.get(id) ?? 0, packs: 0, covered: false }); continue; }
    const label = `${pick.row.name_en ?? pick.row.name ?? ing.name} ${formatPack(Number(pick.row.pack_qty), pick.row.pack_unit ?? ing.base_unit)}`;
    out.push({ id: ing.slug, name: pick.packs > 1 ? `${label} × ${pick.packs}` : label, price: pick.cost, aisle, dinners: dinners.get(id) ?? 0, packs: pick.packs, covered: false });
  }
  const order = Object.values(AISLE);
  return out.sort((a, b) => order.indexOf(a.aisle) - order.indexOf(b.aisle) || a.name.localeCompare(b.name));
}

/** True when every dinner can be priced at this chain. */
export const allPriced = (cat: Catalog, titles: string[], chainId: string, people: number) => titles.every((t) => recipeCost(cat, t, chainId, people) !== null);
