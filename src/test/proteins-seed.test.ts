import { describe, expect, it } from "vitest";
import { NEW_STAPLES, RECIPES, type Step } from "../../db/seed/recipes";
import { PROTEIN_CUISINE, PROTEIN_RECIPES } from "../../db/seed/proteins";

const KNOWN = new Set(["eggs", "carrots", "lemon", "onion", "peppers", "potatoes", "spinach", "chicken", "chicken-breast", "tuna", "chickpeas", "coconut-milk", "olive-oil",
  "rice", "salt", "soy-sauce", "spaghetti", "beef-mince", "pork-loin", "hake", "canned-tomato", ...NEW_STAPLES.map((s) => s.slug)]);
const TYPES = new Set(["curry", "rice-bowls", "pasta", "potato-salad", "stir-fry", "soups", "chilli"]);
const ok = (s: Step[]) => s.length > 0 && s.every((x) => x.text.length > 5 && (x.timer === undefined || (Number.isInteger(x.timer) && x.timer > 0)));

describe("protein recipe seed", () => {
  it("has 14 unique recipes: 5 beef, 4 pork, 5 hake", () => {
    expect(PROTEIN_RECIPES).toHaveLength(14);
    const all = [...RECIPES, ...PROTEIN_RECIPES];
    expect(new Set(all.map((r) => r.slug)).size).toBe(all.length);
    expect(new Set(all.map((r) => r.title)).size).toBe(all.length);
    expect(new Set(all.map((r) => `${r.type}:${Object.keys(r.ing).sort().join(",")}`)).size).toBe(all.length);
    const n = (k: string) => PROTEIN_RECIPES.filter((r) => k in r.ing).length;
    expect([n("beef-mince"), n("pork-loin"), n("hake")]).toEqual([5, 4, 5]);
  });
  it("uses known ingredients, valid types, steps and a cuisine label", () => {
    for (const r of PROTEIN_RECIPES) {
      expect(TYPES.has(r.type), r.slug).toBe(true);
      for (const [s, q] of Object.entries(r.ing)) { expect(KNOWN.has(s), `${r.slug}: ${s}`).toBe(true); expect(q).toBeGreaterThan(0); }
      expect(Object.keys(r.ing).length).toBeGreaterThanOrEqual(4);
      expect(r.minutes).toBeLessThanOrEqual(45);
      expect(ok(r.relaxed) && ok(r.fast), r.slug).toBe(true);
      expect(PROTEIN_CUISINE[r.slug], r.slug).toBeTruthy();
      expect(Object.keys(r.ing).filter((s) => ["beef-mince", "pork-loin", "hake"].includes(s))).toHaveLength(1);
    }
  });
});
