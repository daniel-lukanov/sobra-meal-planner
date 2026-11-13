import { describe, expect, it } from "vitest";
import { RECIPES, BACKFILL } from "../../db/seed/recipes";
import type { Meal } from "@/data/plan";
import { fitsDiet, buildWeek, alternatives, type WeekCtx } from "@/lib/week";
import { planWeek, typeSlug } from "@/lib/recipe-pool";

// Pool from the seed file: ingredient slugs stand in for base ingredients, diet flags come from slugs.
const MEAT = ["chicken", "chicken-breast", "chicken-thighs"], FISH = ["tuna"], EGG = ["eggs"];
const base = (s: string) => (s.startsWith("chicken") ? "chicken" : s);
const STAPLES = new Set(["salt", "olive-oil", "garlic", "black-pepper", "paprika", "cumin", "curry-powder", "oregano", "vinegar", "soy-sauce", "water"]);
const pool: Meal[] = RECIPES.map((r) => {
  const slugs = Object.keys(r.ing);
  return {
    title: r.title, how: r.how, price: 2, type: r.type, tags: r.tags,
    uses: [...new Set(slugs.filter((s) => !STAPLES.has(s)).map(base))],
    flags: { meat: slugs.some((s) => MEAT.includes(s)), fish: slugs.some((s) => FISH.includes(s)), egg: slugs.some((s) => EGG.includes(s)), dairy: false, pork: false },
  };
});
void BACKFILL;
const titles = (rows: ReturnType<typeof planWeek>) => rows!.flatMap((r) => (r.kind === "day" ? [r.options[0]!.title] : []));

describe("planWeek", () => {
  it("builds prep, 3 dinners, prep, 3 dinners with two options each", () => {
    const rows = planWeek(pool, { diet: ["Meat", "Fish"], types: [] })!;
    expect(rows.map((r) => r.kind)).toEqual(["prep", "day", "day", "day", "prep", "day", "day", "day"]);
    expect(new Set(titles(rows)).size).toBe(6);
    for (const r of rows) if (r.kind === "day") expect(r.options.length).toBe(2);
  });
  it("is deterministic", () => {
    const a = planWeek(pool, { diet: ["Meat", "Fish"], types: ["Curry"] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(planWeek(pool, { diet: ["Meat", "Fish"], types: ["Curry"] })));
  });
  it("respects vegan and vegetarian diets in every option", () => {
    for (const diet of [["Vegan"], ["Vegetarian"], ["Fish"], []]) {
      const rows = planWeek(pool, { diet, types: [] })!;
      for (const r of rows) if (r.kind === "day") for (const m of r.options) expect(fitsDiet(m, diet)).toBe(true);
    }
    const vegan = planWeek(pool, { diet: ["Vegan"], types: [] })!;
    expect(vegan.flatMap((r) => (r.kind === "day" ? r.options : [])).some((m) => m.flags!.meat || m.flags!.fish || m.flags!.egg)).toBe(false);
  });
  it("prefers the meal types the person picked", () => {
    const rows = planWeek(pool, { diet: ["Meat", "Fish"], types: ["Curry"] })!;
    expect(titles(rows).some((t) => pool.find((m) => m.title === t)!.type === "curry")).toBe(true);
  });
  it("shares prepped bases inside each half week", () => {
    const rows = planWeek(pool, { diet: ["Meat", "Fish"], types: [] })!;
    for (const [from] of [[0], [4]] as const) {
      const meals = [1, 2, 3].map((k) => (rows[from + k] as { options: Meal[] }).options[0]!);
      const all = meals.flatMap((m) => m.uses);
      expect(all.length - new Set(all).size).toBeGreaterThan(0);
    }
  });
  it("returns null when too few dinners fit", () => {
    expect(planWeek(pool.slice(0, 4), { diet: ["Meat", "Fish"], types: [] })).toBeNull();
  });
  it("swap offers dinners that fit the diet and are not already in the week", () => {
    const plan = planWeek(pool, { diet: ["Vegan"], types: [] })!;
    const ctx: WeekCtx = { plan, pool };
    const week = new Set(buildWeek({}, ctx).flatMap((c) => c.days.map((d) => d.meal.title)));
    const alts = alternatives(1, {}, ["Vegan"], ctx);
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) { expect(fitsDiet(a, ["Vegan"])).toBe(true); expect(week.has(a.title)).toBe(false); }
  });
  it("maps survey labels to meal type slugs", () => {
    expect(typeSlug("Rice bowls")).toBe("rice-bowls");
    expect(typeSlug("Bacalhau à Brás")).toBe("bacalhau-a-bras");
  });
});
