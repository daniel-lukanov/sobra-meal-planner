import { describe, expect, it } from "vitest";
import { withShelfLife } from "@/lib/shelf-life";

const ing = (id: string, slug: string, category: string) => ({ id, slug, parent_id: null, base_unit: "g", category, is_pantry_staple: false, name: slug });
const ings = [ing("c", "carrots", "fruit_veg"), ing("r", "rice", "pantry"), ing("o", "onion", "fruit_veg"), ing("p", "peppers", "fruit_veg")];
const g = [
  { ingredient_id: "c", location: "fridge", min_days: 14, max_days: 21 },
  { ingredient_id: "r", location: "pantry", min_days: 365, max_days: 365 },
  { ingredient_id: "o", location: "pantry", min_days: 30, max_days: 30 },
  { ingredient_id: "o", location: "fridge", min_days: 60, max_days: 60 },
];
const item = (id: string, daysLeft: number | null) => ({ id, name: id, daysLeft, maxDays: 9 });

describe("withShelfLife", () => {
  it("uses the short end of the approved range", () => {
    expect(withShelfLife([item("carrots", 21)], g, ings)[0]).toMatchObject({ daysLeft: 14, maxDays: 21 });
  });
  it("shows long-life foods as long life", () => {
    expect(withShelfLife([item("rice", 5)], g, ings)[0]).toMatchObject({ daysLeft: null, maxDays: 365 });
  });
  it("fresh food follows the fridge number when both exist", () => {
    expect(withShelfLife([item("onions", 18)], g, ings)[0]).toMatchObject({ daysLeft: 60 });
  });
  it("leaves foods without an approved guideline as they were", () => {
    expect(withShelfLife([item("peppers", 7)], g, ings)[0]).toMatchObject({ daysLeft: 7, maxDays: 9 });
  });
});
