import type { Key } from "@/lib/i18n";

export const SURVEY_VERSION = "v3_savings";
export type QId = "q1" | "q2" | "q3" | "q4" | "q5" | "q5b" | "q6" | "q7" | "q8" | "q9";
export type QDef = { id: QId; field: string; kind: "single" | "multi"; shuffle?: boolean; options: { value: string; exclusive?: boolean }[] };

const o = (...v: string[]) => v.map((value) => ({ value }));
export const QUESTIONS: Record<QId, QDef> = {
  q1: { id: "q1", field: "b1_household", kind: "single", options: o("just_me", "two", "three_four", "five_plus") },
  q2: { id: "q2", field: "b1_weekly_spend", kind: "single", options: o("u30", "30_60", "60_100", "100_150", "o150") },
  q3: { id: "q3", field: "b1_deal_habits", kind: "multi", shuffle: true, options: [...o("flyer", "grab", "loyalty", "multi"), { value: "none", exclusive: true }] },
  q4: { id: "q4", field: "b3_number_trust", kind: "single", options: o("yes", "high", "low", "unsure") },
  q5: { id: "q5", field: "b3_actions", kind: "multi", shuffle: true, options: [...o("cheaper", "brand", "store_brand", "split"), { value: "nothing", exclusive: true }] },
  q5b: { id: "q5b", field: "b3_action_blockers", kind: "multi", options: o("far", "small", "brands", "hassle", "none") },
  q6: { id: "q6", field: "b3_input", kind: "single", options: o("photo", "pick", "loyalty", "neither") },
  q7: { id: "q7", field: "b3_frequency", kind: "single", options: o("weekly", "biweekly", "big", "never") },
  q8: { id: "q8", field: "b3_pmf", kind: "single", options: o("very", "some", "not") },
  q9: { id: "q9", field: "b3_stoppers", kind: "multi", shuffle: true, options: [...o("trust", "slow", "small", "forget", "fine"), { value: "nothing", exclusive: true }] },
};
export const qKey = (id: QId) => `${id}.q` as Key;
export const optKey = (id: QId, v: string) => `${id}.${v}` as Key;

/** Shuffles the non-exclusive options; exclusive options always stay last. Returns the shown order of values. */
export function shownOrder(q: QDef, rand: () => number = Math.random): string[] {
  const free = q.options.filter((x) => !x.exclusive).map((x) => x.value);
  if (q.shuffle) for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [free[i], free[j]] = [free[j]!, free[i]!]; }
  return [...free, ...q.options.filter((x) => x.exclusive).map((x) => x.value)];
}

/** Toggles one option of a multi-select. An exclusive option clears the others, and picking another clears an exclusive one. */
export function toggleMulti(q: QDef, current: readonly string[], value: string): string[] {
  const opt = q.options.find((x) => x.value === value);
  if (!opt) return [...current];
  if (current.includes(value)) return current.filter((v) => v !== value);
  if (opt.exclusive) return [value];
  const exclusive = new Set(q.options.filter((x) => x.exclusive).map((x) => x.value));
  return [...current.filter((v) => !exclusive.has(v)), value];
}
