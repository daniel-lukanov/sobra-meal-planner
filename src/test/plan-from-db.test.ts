import { describe, expect, it } from "vitest";
import { buildShoppingList, cheapestPacks, recipeCost, type Catalog } from "@/lib/plan-from-db";
import type { PriceRow } from "@/lib/deals-from-db";

const ing = (id: string, slug: string, category: string, base_unit = "g", extra: object = {}) =>
  ({ id, slug, parent_id: null, base_unit, category, is_pantry_staple: false, name: slug, ...extra });
const price = (o: Partial<PriceRow>): PriceRow => ({
  chain_id: "continente", deal_text: null, effective_price: 1, ingredient_id: "rice", name: "Arroz", name_en: "Rice", pack_qty: 1000, pack_unit: "g",
  price_per_base_unit: 0.001, product_id: "p", promo_ends_on: null, promo_price: null, regular_price: 1, requires_loyalty_card: false, ...o,
});

const cat: Catalog = {
  ingredients: [
    ing("rice", "rice", "pantry"), ing("chicken", "chicken", "meat_fish"),
    ing("thigh", "chicken-thighs", "meat_fish", "g", { parent_id: "chicken" }), ing("oil", "olive-oil", "pantry", "ml", { is_pantry_staple: true }),
  ],
  recipes: [{ id: "r1", slug: "a", title: "Chicken rice", servings: 2 }, { id: "r2", slug: "b", title: "Plain rice", servings: 2 }],
  lines: [
    { recipe_id: "r1", ingredient_id: "rice", quantity: 150, is_optional: false }, { recipe_id: "r1", ingredient_id: "chicken", quantity: 300, is_optional: false },
    { recipe_id: "r1", ingredient_id: "oil", quantity: 15, is_optional: false }, { recipe_id: "r2", ingredient_id: "rice", quantity: 150, is_optional: false },
  ],
  prices: [
    price({ product_id: "rice1", effective_price: 1.2, price_per_base_unit: 1.2 / 1000 }),
    price({ product_id: "rice2", name_en: "Rice Big", pack_qty: 5000, effective_price: 4, price_per_base_unit: 4 / 5000 }),
    price({ product_id: "ch1", ingredient_id: "thigh", name_en: "Thighs", pack_qty: 1000, effective_price: 5, price_per_base_unit: 5 / 650 }), // 650 g usable of 1000 g
  ],
};

describe("recipeCost", () => {
  it("is the share of each pack, uses the cheapest unit price, ignores pantry staples and rolls children up to the parent", () => {
    // rice 150 g at 0.0008 = 0.12, chicken 300 g at 5/650 = 2.3077, oil ignored
    expect(recipeCost(cat, "Chicken rice", "continente", 2)).toBe(2.43);
  });
  it("scales with the number of people", () => {
    expect(recipeCost(cat, "Plain rice", "continente", 4)).toBe(0.24);
  });
  it("is null when an ingredient has no price at that chain or the dinner is unknown", () => {
    expect(recipeCost(cat, "Chicken rice", "lidl", 2)).toBeNull();
    expect(recipeCost(cat, "Nope", "continente", 2)).toBeNull();
  });
});

describe("shopping list", () => {
  it("buys whole packs and picks the cheapest way to cover the quantity", () => {
    const r = cat.ingredients[0]!;
    expect(cheapestPacks(cat, r, "continente", 300)!.row.product_id).toBe("rice1"); // 1.20 for 1 kg beats 4.00 for 5 kg
    expect(cheapestPacks(cat, r, "continente", 4000)!.row.product_id).toBe("rice2"); // 4.00 for 5 kg beats 4 x 1.20
    const one = cheapestPacks({ ...cat, prices: cat.prices.filter((p) => p.product_id !== "rice2") }, r, "continente", 1500)!;
    expect(one.packs).toBe(2);
    expect(one.cost).toBe(2.4);
  });
  it("adds quantities over dinners, skips pantry staples and names the pack", () => {
    const list = buildShoppingList(cat, ["Chicken rice", "Plain rice"], "continente", 2);
    const rice = list.find((l) => l.id === "rice")!;
    expect(rice.dinners).toBe(2);
    expect(rice.aisle).toBe("Pantry");
    expect(rice.name).toContain("Rice");
    expect(list.some((l) => l.id === "olive-oil")).toBe(false);
    expect(list.find((l) => l.id === "chicken")!.price).toBe(5);
  });
  it("keeps unpriced ingredients on the list without a price", () => {
    const list = buildShoppingList(cat, ["Chicken rice"], "lidl", 2);
    expect(list.every((l) => l.price === null)).toBe(true);
  });
});

describe("shopping list with a fridge", () => {
  const rice = cat.ingredients[0]!.id;
  it("needs nothing when the fridge holds enough, and says so", () => {
    const line = buildShoppingList(cat, ["Plain rice", "Plain rice"], "continente", 2, new Map([[rice, 300]])).find((l) => l.id === "rice")!;
    expect(line).toMatchObject({ covered: true, price: null, packs: 0 });
  });
  it("buys only the missing part", () => {
    const line = buildShoppingList(cat, ["Plain rice", "Plain rice"], "continente", 2, new Map([[rice, 100]])).find((l) => l.id === "rice")!;
    expect(line.covered).toBe(false);
    expect(line.price).toBe(1.2); // 200 g still missing: one 1 kg pack
  });
  it("an item without an amount counts as enough, and a parent covers its children", () => {
    expect(buildShoppingList(cat, ["Plain rice"], "continente", 2, new Map([[rice, null]])).find((l) => l.id === "rice")!.covered).toBe(true);
    expect(buildShoppingList(cat, ["Chicken rice"], "continente", 2, new Map([["chicken", 300]])).find((l) => l.id === "chicken")!.covered).toBe(true);
  });
});
