import { describe, expect, it } from "vitest";
import { buildLiveDeals, formatPack, variantKey, type PriceRow } from "@/lib/deals-from-db";

const ings = [{ id: "i-oil", slug: "olive-oil" }, { id: "i-tuna", slug: "tuna" }];
const row = (o: Partial<PriceRow>): PriceRow => ({
  chain_id: "continente", deal_text: null, effective_price: 1, ingredient_id: "i-oil", name: "X", pack_qty: 750, pack_unit: "ml",
  price_per_base_unit: 0.001, product_id: "p", promo_ends_on: "2026-11-15", promo_price: null, regular_price: 1, requires_loyalty_card: false, ...o,
});

describe("buildLiveDeals", () => {
  it("compares a deal with the cheapest regular price per usable unit across chains", () => {
    const rows = [
      row({ product_id: "a", name: "Azeite A", effective_price: 4, promo_price: 4, regular_price: 5, price_per_base_unit: 4 / 750 }),
      row({ product_id: "b", name: "Azeite B", chain_id: "lidl", effective_price: 3, regular_price: 3, price_per_base_unit: 3 / 750 }),
    ];
    const d = buildLiveDeals(rows, ings).Continente![0];
    expect(d.cheapestRegular).toBe(3); // Lidl's regular 3.00 per 750 ml beats the 4.00 promotion: a price trap
    expect(d.price).toBe(4);
    expect(d.name).toBe("Azeite A 750 ml");
  });
  it("uses the usable weight when comparing (tuna cans)", () => {
    const rows = [
      row({ ingredient_id: "i-tuna", product_id: "a", name: "Atum A", pack_qty: 120, pack_unit: "g", effective_price: 1.4, promo_price: 1.4, regular_price: 1.8, price_per_base_unit: 1.4 / 84 }),
      row({ ingredient_id: "i-tuna", product_id: "b", name: "Atum B", pack_qty: 120, pack_unit: "g", effective_price: 1.5, regular_price: 1.5, price_per_base_unit: 1.5 / 84 }),
    ];
    const d = buildLiveDeals(rows, ings).Continente![0];
    expect(d.ingredient).toBe("tuna");
    expect(d.cheapestRegular).toBe(1.5);
  });
  it("ignores products without a real discount and stores without promotions", () => {
    const out = buildLiveDeals([row({ promo_price: 1, regular_price: 1 }), row({ chain_id: "lidl" })], ings);
    expect(out).toEqual({});
  });
  it("does not compare a premium product with the cheapest plain one", () => {
    const rows = [
      row({ product_id: "a", name: "Azeite Virgem Extra Reserva", effective_price: 6, promo_price: 6, regular_price: 9, price_per_base_unit: 6 / 750 }),
      row({ product_id: "b", name: "Azeite Continente", effective_price: 3.25, regular_price: 3.25, price_per_base_unit: 3.25 / 750 }),
    ];
    const d = buildLiveDeals(rows, ings).Continente![0];
    expect(d.cheapestRegular).toBe(9); // only itself in its group: a real saving of 3.00
  });
  it("tags the kind of a product", () => {
    expect(variantKey("Azeite Virgem Extra DOP Moura")).toBe("dop+virgem-extra");
    expect(variantKey("Cenoura Biológica Continente Bio")).toBe("bio");
    expect(variantKey("Filete de Atum em Azeite Tenorio")).toBe("fillet");
    expect(variantKey("Azeite Continente")).toBe("");
    expect(variantKey("Arroz Agulha Selecionado Continente")).toBe("agulha");
  });
  it("formats pack sizes", () => {
    expect(formatPack(1000, "g")).toBe("1 kg");
    expect(formatPack(500, "g")).toBe("500 g");
    expect(formatPack(3000, "ml")).toBe("3 l");
    expect(formatPack(10, "piece")).toBe("10 un");
  });
});
