import { describe, expect, it } from "vitest";
import { BACKFILL, NEW_STAPLES, RECIPES, type Step } from "../../db/seed/recipes";

// ingredients already in the database, plus the staples the seed adds
const KNOWN = new Set(["eggs", "carrots", "lemon", "onion", "peppers", "potatoes", "spinach", "chicken", "chicken-breast", "chicken-drumsticks", "chicken-thighs",
  "tuna", "chickpeas", "coconut-milk", "olive-oil", "rice", "salt", "soy-sauce", "spaghetti", ...NEW_STAPLES.map((s) => s.slug)]);
const TYPES = new Set(["tortilla", "curry", "rice-bowls", "pasta", "roast-chicken", "potato-salad", "stir-fry", "soups", "wraps", "omelette", "bacalhau-a-bras", "chilli", "salads", "gnocchi"]);
const PROTOTYPE = ["roast-potatoes-chicken", "chicken-potato-hash", "potato-salad-tuna", "potato-carrot-soup", "spanish-tortilla", "potato-egg-skillet", "chickpea-curry-rice",
  "chickpea-spinach-stew", "rice-bowl-pepper-egg", "pepper-fried-rice", "pasta-roast-pepper-sauce", "stuffed-peppers-rice", "chicken-fried-rice", "tuna-chickpea-salad",
  "carrot-chickpea-soup", "spinach-omelette", "chicken-spinach-rice", "tuna-pasta-lemon"];
const MEAT = ["chicken", "chicken-breast", "chicken-thighs"];

const stepsOk = (s: Step[]) => s.length > 0 && s.every((x) => x.text.length > 5 && (x.timer === undefined || (Number.isInteger(x.timer) && x.timer > 0)));

describe("recipe seed data", () => {
  it("has 30 new recipes with unique slugs, titles and fingerprints", () => {
    expect(RECIPES).toHaveLength(30);
    expect(new Set(RECIPES.map((r) => r.slug)).size).toBe(30);
    expect(new Set(RECIPES.map((r) => r.title)).size).toBe(30);
    const fps = RECIPES.map((r) => `${r.type}:${Object.keys(r.ing).sort().join(",")}`);
    expect(new Set(fps).size).toBe(30);
    for (const slug of RECIPES.map((r) => r.slug)) expect(PROTOTYPE).not.toContain(slug);
  });
  it("only uses known ingredients, positive quantities and valid meal types", () => {
    for (const r of RECIPES) {
      expect(TYPES.has(r.type), `${r.slug} type ${r.type}`).toBe(true);
      expect(Object.keys(r.ing).length, r.slug).toBeGreaterThanOrEqual(4);
      for (const [slug, q] of Object.entries(r.ing)) { expect(KNOWN.has(slug), `${r.slug}: ${slug}`).toBe(true); expect(q, `${r.slug}: ${slug}`).toBeGreaterThan(0); }
      expect(r.minutes).toBeGreaterThan(0); expect(r.minutes).toBeLessThanOrEqual(45);
    }
  });
  it("has usable steps in both paces, tags and a summary", () => {
    for (const r of RECIPES) { expect(stepsOk(r.relaxed), `${r.slug} relaxed`).toBe(true); expect(stepsOk(r.fast), `${r.slug} fast`).toBe(true); expect(r.tags.length, r.slug).toBeGreaterThan(0); expect(r.summary.length, r.slug).toBeGreaterThan(20); }
    for (const b of BACKFILL) { expect(stepsOk(b.relaxed), `${b.slug} relaxed`).toBe(true); expect(stepsOk(b.fast), `${b.slug} fast`).toBe(true); expect(b.tags.length, b.slug).toBeGreaterThan(0); }
  });
  it("completes exactly the 18 prototype recipes", () => {
    expect(BACKFILL.map((b) => b.slug).sort()).toEqual([...PROTOTYPE].sort());
  });
  it("covers vegan, vegetarian, fish and chicken dinners", () => {
    const kind = (r: (typeof RECIPES)[number]) => { const k = Object.keys(r.ing); return k.some((x) => MEAT.includes(x)) ? "chicken" : k.includes("tuna") ? "fish" : k.includes("eggs") ? "egg" : "vegan"; };
    const n = (k: string) => RECIPES.filter((r) => kind(r) === k).length;
    expect(n("vegan")).toBeGreaterThanOrEqual(8); expect(n("egg")).toBeGreaterThanOrEqual(5); expect(n("fish")).toBeGreaterThanOrEqual(4); expect(n("chicken")).toBeGreaterThanOrEqual(8);
  });
});
