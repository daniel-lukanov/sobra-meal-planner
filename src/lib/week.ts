export const COMING_SOON = "This isn't available yet. Thanks, your tap tells us you'd want it.";
import { extraMeals, weekPlan, type DayRow, type Meal, type PrepRow } from "@/data/plan";
import { shoppingList, type ListItem } from "@/data/list";
import type { IngredientId } from "@/data/ingredients";

const allMeals: Meal[] = [...weekPlan.flatMap((r) => (r.kind === "day" ? r.options : [])), ...extraMeals];
export const mealByTitle = (t: string) => allMeals.find((m) => m.title === t);

const meat: IngredientId[] = ["chicken"];
const fish: IngredientId[] = ["tuna"];
/** A dinner fits the diet when every animal protein in it is allowed. */
export function fitsDiet(m: Meal, diet: string[]) {
  const veg = diet.includes("Vegetarian") || diet.includes("Vegan");
  const vegan = diet.includes("Vegan");
  if (m.uses.some((u) => meat.includes(u)) && (veg || !diet.includes("Meat"))) return false;
  if (m.uses.some((u) => fish.includes(u)) && (veg || !diet.includes("Fish"))) return false;
  if (vegan && m.uses.includes("eggs")) return false;
  return true;
}

export type Card = { i: number; day: string; meal: Meal };
/** The current week: each day shows the chosen dinner, or the first option. */
export function buildWeek(chosen: Record<string, string>) {
  const chapters: { prep: PrepRow; days: Card[] }[] = [];
  weekPlan.forEach((row, i) => {
    if (row.kind === "prep") { chapters.push({ prep: row, days: [] }); return; }
    const r = row as DayRow;
    const meal = (chosen[i] && mealByTitle(chosen[i]!)) || r.options[0]!;
    chapters.at(-1)!.days.push({ i, day: r.day, meal });
  });
  return chapters;
}
export const weekCards = (chosen: Record<string, string>) => buildWeek(chosen).flatMap((c) => c.days);

/** Up to 3 alternatives for one day, preferring dinners that reuse that half-week's prepped bases. */
export function alternatives(i: number, chosen: Record<string, string>, diet: string[]) {
  const chapters = buildWeek(chosen);
  const ch = chapters.find((c) => c.days.some((d) => d.i === i))!;
  const current = ch.days.find((d) => d.i === i)!.meal;
  const inWeek = new Set(chapters.flatMap((c) => c.days.map((d) => d.meal.title)));
  const bases = new Set<IngredientId>(ch.days.flatMap((d) => d.meal.uses));
  return allMeals
    .filter((m) => m.title !== current.title && !inWeek.has(m.title) && fitsDiet(m, diet))
    .map((m) => ({ m, score: m.uses.filter((u) => bases.has(u)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.m);
}

export type NeededItem = ListItem & { aisle: string; dinners: number };
/** Shopping list for the week: only ingredients some dinner still needs. */
export function neededItems(cards: Card[]): NeededItem[] {
  const count = new Map<string, number>();
  for (const c of cards) for (const u of c.meal.uses) count.set(u, (count.get(u) ?? 0) + 1);
  return shoppingList.flatMap((g) => g.items.filter((it) => count.has(it.id)).map((it) => ({ ...it, aisle: g.aisle, dinners: count.get(it.id)! })));
}
const r2 = (n: number) => Math.round(n * 100) / 100;
export const weekTotal = (cards: Card[]) => r2(cards.reduce((a, c) => a + c.meal.price, 0));
export const listTotal = (items: NeededItem[]) => r2(items.reduce((a, it) => a + (it.inFridge ? 0 : it.price ?? 0), 0));
export const perPerson = (total: number, people: number) => r2(total / Math.max(1, people));

export function shareText(o: { store: string; dinners: { day: string; title: string }[]; total: number; people: number; items: string[]; link: string | null }) {
  const each = perPerson(o.total, o.people).toFixed(2);
  const lines = [
    `Our dinners this week from ${o.store}: ${o.dinners.length} dinners for €${o.total.toFixed(2)}, €${each} each if we split between ${o.people} ${o.people === 1 ? "person" : "people"}.`,
    ...o.dinners.map((d) => `${d.day}: ${d.title}`),
    `Shopping list: ${o.items.join(", ")}`,
    ...(o.link ? [`Open the plan: ${o.link}`] : []),
    "Sample prices, no guarantee.",
  ];
  return lines.join("\n");
}
