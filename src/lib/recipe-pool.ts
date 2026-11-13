// Dinners and the weekly plan built from our own database recipes (pure logic, tested in src/test/recipe-pool.test.ts).
// A dinner is a recipe: ingredients come from recipe_ingredient, diet flags from the recipe_diet_flags view, steps from the recipe row.
import type { DayRow, Meal, PlanRow, PrepRow } from "@/data/plan";
import type { Step } from "@/data/cook";
import type { CatIngredient, CatLine } from "@/lib/plan-from-db";
import { fitsDiet } from "@/lib/week";

export type DbRecipe = { id: string; slug: string; title: string; meal_type: string; summary: string | null; how: string | null; minutes: number | null; image_url: string | null; steps_relaxed: unknown; steps_fast: unknown };
export type DbFlags = { recipe_id: string; has_pork: boolean; has_beef: boolean; has_poultry: boolean; has_other_meat: boolean; has_fish: boolean; has_shellfish: boolean; has_dairy: boolean; has_egg: boolean };
export type PoolInput = { recipes: DbRecipe[]; lines: CatLine[]; ingredients: CatIngredient[]; flags: DbFlags[]; tags: { recipe_id: string; tag: string }[] };

const asSteps = (v: unknown): Step[] => (Array.isArray(v) ? v.filter((x): x is Step => !!x && typeof (x as Step).text === "string") : []);

/** Dinners we can show and cook: published recipes with steps. Prices are filled in later from the store's prices. */
export function buildPool(inp: PoolInput, fallbackPrice = 2): Meal[] {
  const ing = new Map(inp.ingredients.map((i) => [i.id, i]));
  const flags = new Map(inp.flags.map((f) => [f.recipe_id, f]));
  const out: Meal[] = [];
  for (const r of inp.recipes) {
    const relaxed = asSteps(r.steps_relaxed), fast = asSteps(r.steps_fast);
    if (relaxed.length === 0) continue;
    const uses: string[] = [], names: Record<string, string> = {};
    for (const l of inp.lines) {
      if (l.recipe_id !== r.id || l.is_optional) continue;
      const i = ing.get(l.ingredient_id);
      if (!i || i.is_pantry_staple) continue;
      const base = (i.parent_id && ing.get(i.parent_id)) || i;
      if (!uses.includes(base.slug)) { uses.push(base.slug); names[base.slug] = base.name; }
    }
    const f = flags.get(r.id);
    out.push({
      title: r.title, how: r.how ?? "", uses, names, price: fallbackPrice, slug: r.slug, type: r.meal_type, summary: r.summary ?? "",
      ...(r.minutes ? { minutes: r.minutes } : {}), ...(r.image_url ? { image: r.image_url } : {}),
      flags: { meat: !!f && (f.has_pork || f.has_beef || f.has_poultry || f.has_other_meat), fish: !!f && (f.has_fish || f.has_shellfish), egg: !!f?.has_egg, dairy: !!f?.has_dairy, pork: !!f?.has_pork },
      tags: inp.tags.filter((t) => t.recipe_id === r.id).map((t) => t.tag),
      steps: { relaxed, fast: fast.length ? fast : relaxed },
    });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

/** Survey meal-type labels ("Rice bowls") to database slugs ("rice-bowls"). */
export const typeSlug = (label: string) => label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type PlanOpts = { diet: string[]; types: string[]; priced?: (m: Meal) => boolean };

const HALVES: { prep: { day: string; title: string }; days: string[] }[] = [
  { prep: { day: "Sun", title: "Prep session 1" }, days: ["Mon", "Tue", "Wed"] },
  { prep: { day: "Wed", title: "Prep session 2" }, days: ["Thu", "Fri", "Sat"] },
];

const overlap = (a: string[], b: Set<string>) => a.filter((x) => b.has(x)).length;
const protein = (m: Meal) => (m.flags?.meat ? "meat" : m.flags?.fish ? "fish" : m.flags?.egg ? "egg" : "veg");
const tie = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 10000;

/**
 * Six dinners in two halves of three, each half built around shared prepped bases (cook once, eat three times).
 * Same shape as the static week: prep, three dinners, prep, three dinners, each dinner with two options.
 * Returns null when too few dinners fit the diet. Deterministic: the same inputs give the same week.
 */
export function planWeek(pool: Meal[], o: PlanOpts): PlanRow[] | null {
  const eligible = pool.filter((m) => fitsDiet(m, o.diet));
  if (eligible.length < 6) return null;
  const wanted = new Set(o.types.map(typeSlug));
  const wantProtein = o.diet.includes("High protein");
  const popularity = new Map<string, number>();
  for (const m of eligible) for (const u of m.uses) popularity.set(u, (popularity.get(u) ?? 0) + 1);

  const used = new Set<string>();
  const usedTypes = new Map<string, number>(), usedProtein = new Map<string, number>();
  const score = (m: Meal, half: Meal[]) => {
    const shared = overlap(m.uses, new Set(half.flatMap((h) => h.uses)));
    const pop = half.length === 0 ? m.uses.reduce((a, u) => a + (popularity.get(u) ?? 0), 0) / (eligible.length * 4) : 0;
    return 2 * shared + pop
      + (m.type && wanted.has(m.type) ? 2 : 0)
      + (wantProtein && m.tags?.includes("high-protein") ? 1.5 : 0)
      + (o.priced?.(m) ? 1.5 : 0)
      - 2 * (usedTypes.get(m.type ?? "") ?? 0) - 1 * (usedProtein.get(protein(m)) ?? 0)
      + tie(m.title);
  };
  const rank = (half: Meal[], skip: Set<string>) => eligible.filter((m) => !used.has(m.title) && !skip.has(m.title)).map((m) => ({ m, s: score(m, half) })).sort((a, b) => b.s - a.s || a.m.title.localeCompare(b.m.title));

  const rows: PlanRow[] = [];
  for (const [h, half] of HALVES.entries()) {
    const picks: Meal[] = [];
    for (let k = 0; k < 3; k++) {
      const best = rank(picks, new Set())[0]?.m;
      if (!best) return null;
      picks.push(best); used.add(best.title);
      usedTypes.set(best.type ?? "", (usedTypes.get(best.type ?? "") ?? 0) + 1);
      usedProtein.set(protein(best), (usedProtein.get(protein(best)) ?? 0) + 1);
    }
    // Second option for each day: the best remaining dinner that shares bases with this half.
    const shown = new Set(picks.map((p) => p.title));
    const days: DayRow[] = picks.map((p, k) => {
      const alt = rank(picks, shown).find((x) => x.m.title !== p.title)?.m;
      if (alt) shown.add(alt.title);
      return { kind: "day", day: HALVES[h]!.days[k]!, options: alt ? [p, alt] : [p] };
    });
    const count = new Map<string, number>();
    for (const p of picks) for (const u of p.uses) count.set(u, (count.get(u) ?? 0) + 1);
    const shared = [...count].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([u]) => u);
    const nameOf = (u: string) => (picks.find((p) => p.names?.[u])?.names?.[u] ?? u).toLowerCase();
    const minutes = Math.min(50, 15 + 8 * shared.length);
    const prep: PrepRow = {
      kind: "prep", day: HALVES[h]!.prep.day, title: HALVES[h]!.prep.title,
      meta: shared.length ? `${minutes} min · cook ${shared.slice(0, 3).map(nameOf).join(", ")} once` : `${minutes} min · wash and chop`,
      tags: (shared.length ? shared : [...count.keys()]).slice(0, 4).map((u) => picks.find((p) => p.names?.[u])?.names?.[u] ?? u),
      ...(h === 0 ? { note: "Cooked food keeps 3 to 4 days, so a second short prep on Wednesday covers the rest of the week." } : {}),
    };
    rows.push(prep, ...days);
  }
  return rows;
}
