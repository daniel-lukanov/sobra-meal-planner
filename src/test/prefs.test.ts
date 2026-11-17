import { describe, expect, it } from "vitest";
import type { Meal } from "@/data/plan";
import { ALL_PROTEINS, combinePrefs, dietToPrefs, fitsPrefs, goalScore, mealAllergens, type Prefs } from "@/lib/prefs";
import { planWeek } from "@/lib/recipe-pool";

const base: Prefs = { lifestyle: "none", proteins: ALL_PROTEINS, allergens: [], goals: [] };
const dinner = (o: Partial<Meal> & { f?: Partial<NonNullable<Meal["flags"]>> } = {}): Meal => ({
  title: o.title ?? "Dinner", how: "", uses: o.uses ?? [], price: 2, ...(o.tags ? { tags: o.tags } : {}), ...(o.allergens ? { allergens: o.allergens } : {}),
  flags: { meat: false, fish: false, egg: false, dairy: false, pork: false, ...o.f },
});

describe("fitsPrefs", () => {
  it("hides a dinner with a stated allergen, including ones the diet flags prove", () => {
    expect(fitsPrefs(dinner({ allergens: ["gluten"] }), { ...base, allergens: ["gluten"] })).toBe(false);
    expect(fitsPrefs(dinner({ f: { dairy: true } }), { ...base, allergens: ["milk"] })).toBe(false);
    expect(fitsPrefs(dinner({ f: { dairy: true } }), { ...base, allergens: ["lactose"] })).toBe(false);
    expect(fitsPrefs(dinner({ f: { egg: true } }), { ...base, allergens: ["eggs"] })).toBe(false);
    expect(fitsPrefs(dinner({ f: { fish: true, shellfish: true } }), { ...base, allergens: ["crustaceans"] })).toBe(false);
    expect(fitsPrefs(dinner(), { ...base, allergens: ["gluten", "milk"] })).toBe(true);
  });
  it("lets only the animal proteins the person eats through", () => {
    const pork = dinner({ f: { meat: true, pork: true } });
    expect(fitsPrefs(pork, { ...base, proteins: ["poultry", "fish"] })).toBe(false);
    expect(fitsPrefs(pork, base)).toBe(true);
    const mixed = dinner({ f: { fish: true, finfish: true, shellfish: true } });
    expect(fitsPrefs(mixed, { ...base, proteins: ["fish"] })).toBe(false);
  });
  it("keeps eggs and dairy for vegetarians, not for vegans, and no fish or meat for either", () => {
    const veg: Prefs = { ...base, lifestyle: "vegetarian", proteins: [] }, vegan: Prefs = { ...base, lifestyle: "vegan", proteins: [] };
    expect(fitsPrefs(dinner({ f: { egg: true, dairy: true } }), veg)).toBe(true);
    expect(fitsPrefs(dinner({ f: { egg: true } }), vegan)).toBe(false);
    expect(fitsPrefs(dinner({ f: { fish: true, finfish: true } }), veg)).toBe(false);
    expect(fitsPrefs(dinner({ f: { meat: true, poultry: true } }), veg)).toBe(false);
  });
});

describe("planWeek with allergies", () => {
  const pool = Array.from({ length: 8 }, (_, i) => dinner({ title: `D${i}`, uses: ["x"], ...(i < 5 ? { allergens: ["sesame"] } : {}) }));
  it("shows fewer dinners, never one with the allergen", () => {
    const rows = planWeek(pool, { prefs: { ...base, allergens: ["sesame"] }, types: [] });
    const meals = rows.flatMap((r) => (r.kind === "day" ? r.options : []));
    expect(meals.length).toBeGreaterThan(0);
    expect(meals.every((m) => !mealAllergens(m).has("sesame"))).toBe(true);
    expect(rows.filter((r) => r.kind === "day").length).toBeLessThan(6);
  });
  it("is empty when nothing fits", () => {
    expect(planWeek(pool.slice(0, 5), { prefs: { ...base, allergens: ["sesame"] }, types: [] })).toEqual([]);
  });
  it("saving money ranks the cheaper dinner first", () => {
    const cheap = { ...dinner({ title: "Cheap", uses: ["a"] }), price: 1 }, dear = { ...dinner({ title: "Dear", uses: ["b"] }), price: 6 };
    const rows = planWeek([dear, cheap], { prefs: { ...base, goals: ["budget"] }, types: [], cheaper: (m) => m.price });
    const first = rows.find((r) => r.kind === "day");
    expect(first && first.kind === "day" && first.options[0]!.title).toBe("Cheap");
  });
});

describe("goals, household and migration", () => {
  it("counts matching labels", () => {
    expect(goalScore(dinner({ tags: ["budget", "quick"] }), ["budget", "light"])).toBe(1);
  });
  it("combines a household: strictest diet, shared proteins, every allergen", () => {
    const a: Prefs = { ...base, proteins: ["fish", "poultry"], allergens: ["gluten"] };
    const b: Prefs = { lifestyle: "vegetarian", proteins: [], allergens: ["soy"], goals: ["budget"] };
    const c = combinePrefs([a, b]);
    expect(c.lifestyle).toBe("vegetarian");
    expect(c.proteins).toEqual([]);
    expect(c.allergens.sort()).toEqual(["gluten", "soy"]);
    expect(combinePrefs([a, { ...base, proteins: ["poultry", "beef"] }]).proteins).toEqual(["poultry"]);
  });
  it("turns an old saved diet into the new settings", () => {
    expect(dietToPrefs(["Meat", "Fish", "No pork", "High protein"])).toEqual({ lifestyle: "none", proteins: ["poultry", "beef", "other_meat", "fish", "shellfish"], allergens: [], goals: ["high_protein"] });
    expect(dietToPrefs(["Vegan", "Meat"]).proteins).toEqual([]);
  });
});
