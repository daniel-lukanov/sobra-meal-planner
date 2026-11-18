// What a person eats, avoids and wants from a dinner. Pure logic, tested in src/test/prefs.test.ts.
// Allergies are a hard filter: a dinner with a stated allergen is never shown. Goals only rank dinners.
import type { Meal, MealFlags } from "@/data/plan";

export type Lifestyle = "none" | "vegetarian" | "vegan";
export type Prefs = { lifestyle: Lifestyle; proteins: string[]; allergens: string[]; goals: string[] };

export const PROTEINS = [
  { code: "poultry", label: "Chicken and poultry" },
  { code: "beef", label: "Beef" },
  { code: "pork", label: "Pork" },
  { code: "other_meat", label: "Other meat (lamb, rabbit)" },
  { code: "fish", label: "Fish" },
  { code: "shellfish", label: "Shellfish" },
] as const;
export const ALL_PROTEINS: string[] = PROTEINS.map((p) => p.code);

/** The 14 EU allergens, plus two common intolerances. */
export const ALLERGENS = [
  { code: "gluten", label: "Gluten (wheat, rye, barley, oats)" },
  { code: "crustaceans", label: "Crustaceans" },
  { code: "eggs", label: "Eggs" },
  { code: "fish", label: "Fish" },
  { code: "peanuts", label: "Peanuts" },
  { code: "soy", label: "Soy" },
  { code: "milk", label: "Milk" },
  { code: "tree_nuts", label: "Tree nuts" },
  { code: "celery", label: "Celery" },
  { code: "mustard", label: "Mustard" },
  { code: "sesame", label: "Sesame" },
  { code: "sulphites", label: "Sulphites" },
  { code: "lupin", label: "Lupin" },
  { code: "molluscs", label: "Molluscs" },
] as const;
export const INTOLERANCES = [
  { code: "lactose", label: "Lactose intolerance" },
  { code: "gluten", label: "Gluten intolerance" },
] as const;

/** Goals match recipe labels, never nutrition numbers. */
export const GOALS = [
  { code: "high_protein", label: "More protein", tag: "high-protein" },
  { code: "budget", label: "Save money", tag: "budget" },
  { code: "light", label: "Lighter meals", tag: "light" },
  { code: "quick", label: "Quick to cook", tag: "quick" },
] as const;

export const DEFAULT_PREFS: Prefs = { lifestyle: "none", proteins: ALL_PROTEINS, allergens: [], goals: [] };

/** Older saved settings were a list of words ("Meat", "Fish", "Vegan", "No pork", "High protein"). */
export function dietToPrefs(diet: string[]): Prefs {
  const lifestyle: Lifestyle = diet.includes("Vegan") ? "vegan" : diet.includes("Vegetarian") ? "vegetarian" : "none";
  const proteins: string[] = [];
  if (lifestyle === "none") {
    if (diet.includes("Meat")) proteins.push("poultry", "beef", "other_meat", ...(diet.includes("No pork") ? [] : ["pork"]));
    if (diet.includes("Fish")) proteins.push("fish", "shellfish");
  }
  return { lifestyle, proteins, allergens: [], goals: diet.includes("High protein") ? ["high_protein"] : [] };
}

/** Flags of the sample dinners, which have none from the database. */
const legacyFlags = (m: Meal): MealFlags => ({ meat: m.uses.includes("chicken"), fish: m.uses.includes("tuna"), egg: m.uses.includes("eggs"), dairy: false, pork: false });

/** Allergens of a dinner: the database ones plus those the diet flags already prove (milk, eggs, fish, shellfish). */
export function mealAllergens(m: Meal): Set<string> {
  const f = m.flags ?? legacyFlags(m);
  const out = new Set(m.allergens ?? []);
  if (f.egg) out.add("eggs");
  if (f.fish) out.add("fish");
  if (f.dairy) out.add("milk");
  if (f.shellfish) { out.add("crustaceans"); out.add("molluscs"); }
  if (out.has("milk")) out.add("lactose");
  return out;
}

/** True when the dinner has no allergen the person avoids and every animal protein in it is one they eat. */
export function fitsPrefs(m: Meal, p: Prefs): boolean {
  const f = m.flags ?? legacyFlags(m);
  const vegan = p.lifestyle === "vegan", veg = vegan || p.lifestyle === "vegetarian";
  const has = (c: string) => p.proteins.includes(c);
  const meat = f.poultry || f.beef || f.pork || f.otherMeat;
  if (veg && (meat || f.meat || f.fish || f.shellfish || f.finfish)) return false;
  if (vegan && (f.egg || f.dairy)) return false;
  if (f.poultry && !has("poultry")) return false;
  if (f.beef && !has("beef")) return false;
  if (f.pork && !has("pork")) return false;
  if (f.otherMeat && !has("other_meat")) return false;
  // Sample dinners only know "meat" and "fish": allow them when any meat or fish is allowed.
  if (f.meat && f.poultry === undefined && !p.proteins.some((c) => ["poultry", "beef", "pork", "other_meat"].includes(c))) return false;
  const finfish = f.finfish ?? (f.fish && f.shellfish === undefined);
  if (finfish && !has("fish")) return false;
  if (f.shellfish && !has("shellfish")) return false;
  const al = mealAllergens(m);
  return !p.allergens.some((a) => al.has(a));
}

/** Rank bonus from goals: how many of the person's goals this dinner's labels match. */
export function goalScore(m: Meal, goals: string[]): number {
  const tags = new Set(m.tags ?? []);
  return GOALS.filter((g) => goals.includes(g.code) && tags.has(g.tag)).length;
}

/** One household eats one plan: the strictest diet, only proteins everyone eats, every allergen of every member. Goals are everyone's, so the shared plan leans towards all of them. */
export function combinePrefs(list: Prefs[]): Prefs {
  if (list.length === 0) return DEFAULT_PREFS;
  const rank = { none: 0, vegetarian: 1, vegan: 2 } as const;
  const lifestyle = list.reduce<Lifestyle>((a, p) => (rank[p.lifestyle] > rank[a] ? p.lifestyle : a), "none");
  return {
    lifestyle,
    proteins: ALL_PROTEINS.filter((c) => list.every((p) => p.proteins.includes(c))),
    allergens: [...new Set(list.flatMap((p) => p.allergens))],
    goals: [...new Set(list.flatMap((p) => p.goals))],
  };
}
