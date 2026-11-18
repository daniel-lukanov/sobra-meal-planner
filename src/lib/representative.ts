// A short, varied list of dinners to pick from: spread over cuisines, main proteins and meal types.
import type { Meal } from "@/data/plan";
import { goalScore } from "@/lib/prefs";

/** The main protein of a dinner, as one word, for spreading the list. */
export function mainProtein(m: Meal): string {
  const f = m.flags;
  if (!f) return "other";
  if (f.poultry) return "poultry";
  if (f.beef) return "beef";
  if (f.pork) return "pork";
  if (f.otherMeat) return "other meat";
  if (f.finfish || f.fish) return "fish";
  if (f.shellfish) return "shellfish";
  if (f.egg) return "egg";
  return "plant";
}

/** Picks up to `n` dinners one by one, each time taking the one that adds the most variety (new cuisine, protein, meal type), with the person's goals as a light tie-break. Same input, same output. */
export function representative(meals: Meal[], n = 15, goals: string[] = []): Meal[] {
  const left = [...meals].sort((a, b) => a.title.localeCompare(b.title));
  const out: Meal[] = [];
  const count = { c: new Map<string, number>(), p: new Map<string, number>(), t: new Map<string, number>() };
  const key = (m: Meal) => ({ c: m.cuisine ?? "?", p: mainProtein(m), t: m.type ?? "?" });
  while (out.length < n && left.length) {
    let best = 0, bestScore = -Infinity;
    left.forEach((m, i) => {
      const k = key(m);
      const score = -(2 * (count.c.get(k.c) ?? 0) + 2 * (count.p.get(k.p) ?? 0) + (count.t.get(k.t) ?? 0)) + 0.5 * goalScore(m, goals);
      if (score > bestScore) { best = i; bestScore = score; }
    });
    const [m] = left.splice(best, 1);
    const k = key(m!);
    count.c.set(k.c, (count.c.get(k.c) ?? 0) + 1); count.p.set(k.p, (count.p.get(k.p) ?? 0) + 1); count.t.set(k.t, (count.t.get(k.t) ?? 0) + 1);
    out.push(m!);
  }
  return out;
}
