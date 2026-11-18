import { describe, expect, it } from "vitest";
import { compute, shoppingList, weekKey, manualLines, type Line } from "@/lib/savings/engine";
import { byId, DEMO_RECEIPT } from "@/lib/savings/prices";

const demoLines = (): Line[] => DEMO_RECEIPT.productIds.map((id, n) => ({ id: `d${n}`, productId: id, raw: byId(id)!.raw, name: id, price: byId(id)!.prices[0].price }));

describe("demo receipt", () => {
  const res = compute(demoLines(), "Pingo Doce");
  it("gives the exact expected numbers", () => {
    expect(res.total).toBe(54.25);
    expect(res.saving).toBe(14.1);
    expect(res.percent).toBe(26);
    expect(res.monthly).toBe(61);
    expect(res.cheapestStore).toBe("Lidl");
    expect(res.cheapestBasket).toBe(44.95);
    expect(res.tripSaving).toBe(9.3);
    expect(res.userIsCheapest).toBe(false);
  });
  it("ranks the top 5, breaking the milk and minced beef tie by receipt order", () => {
    expect(res.top.map((i) => [i.productId, i.saving])).toEqual([["detergent", 4], ["salmon", 2], ["olive_oil", 2], ["chicken", 1.5], ["beef", 1.2]]);
  });
  it("labels the reason", () => {
    const get = (id: string) => res.items.find((i) => i.productId === id)!;
    expect(get("detergent").basis).toBe("promo");
    expect(get("spaghetti").basis).toBe("store_brand");
    expect(get("yogurt").alreadyBest).toBe(true);
  });
  it("builds a list where every item sits at its cheapest store", () => {
    const list = shoppingList(res);
    expect(list.reduce((s, g) => s + g.saving, 0)).toBeCloseTo(14.1, 2);
    expect(list.find((g) => g.store === "Lidl")!.sections.some((s) => s.section === "meat")).toBe(true);
  });
});

describe("edge cases", () => {
  it("never reports a negative saving and ignores unknown lines", () => {
    const res = compute([{ id: "x", productId: null, raw: "?", name: "Mystery", price: 3 }], "Lidl");
    expect(res.saving).toBe(0);
    expect(res.total).toBe(3);
  });
  it("says the store is already cheapest when it is", () => {
    const lines = manualLines(["spaghetti", "bread"], "Lidl", (id) => id);
    const res = compute(lines, "Lidl");
    expect(res.userIsCheapest).toBe(true);
    expect(res.tripSaving).toBe(0);
  });
  it("makes a week key", () => { expect(weekKey(new Date(2026, 10, 18))).toBe("2026-W47"); });
});
