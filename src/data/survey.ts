import type { StoreName } from "./stores";

export const storeOptions: StoreName[] = ["Pingo Doce", "Continente", "Lidl", "Aldi", "Auchan"];

/** Block 1 */
export const fallbackOptions = ["0", "1–2", "3–4", "5 or more", "I don't cook at home"];
export const painShuffled = [
  "Deciding what to make",
  "Cooking takes too long after uni or work",
  "Groceries cost too much",
  "Not knowing which deals are actually good",
  "Food goes off before I use it",
  "Eating the same thing again and again",
];
export const PAIN_NONE = "None of these";
export const painOptions = [...painShuffled, PAIN_NONE];
export const WORK_NONE = "Nothing, I decide in the shop";
export const workaroundOptions = [
  WORK_NONE,
  "A shopping list on my phone",
  "Save recipes from TikTok or Instagram",
  "Cook a big batch for a few days",
  "Ask ChatGPT or use a meal app",
  "Check the supermarket app or flyer for deals",
];

/** Block 2 */
export const modeOptions = [
  "Weekly prep (cook twice, eat something different every night)",
  "Daily pick (choose tonight, cook fresh)",
  "Both, depending on the week",
  "Neither",
];
export const prepBlockerOptions = [
  "Prepping takes too long",
  "I don't want the same ingredients all week",
  "I don't know my week in advance",
  "Reheated food isn't great",
  "No space or containers for it",
];
export const needsPrepBlockers = (mode: string | null) => mode === modeOptions[1] || mode === modeOptions[3];

/** Block 3 */
export const receiptOptions = ["Yes, every time", "Only if I get cashback", "I'd rather tick items off my shopping list", "No"];
export const receiptBlockerOptions = ["Too much effort", "I don't keep receipts", "I don't need to track what's in my fridge", "I don't want to share what I buy"];
export const keepOneOptions = ["Weekly prep plan", "Daily pick", "Deals checked against the regular price", "Receipt scan for your fridge"];
export const dealBrandOptions = ["Yes", "Only if it's clearly cheaper", "No, I'd stick to my usual brand", "I don't have a usual brand"];
export const pmfOptions = ["Very disappointed", "Somewhat disappointed", "Not disappointed"];
export const STOP_NONE = "Nothing, I'd use it";
export const stopperOptions = ["I don't cook often enough", "Setting it up takes too long", "I don't trust the prices", "I'd forget about it", "What I do now works fine", STOP_NONE];

/**
 * Multi-select rule shared by every question: an exclusive option clears the rest,
 * any other option clears the exclusive one, and `max` caps the non-exclusive picks.
 */
export function toggleMulti(cur: string[], opt: string, rules: { exclusive?: string; max?: number } = {}): { next: string[]; limited: boolean } {
  const { exclusive, max } = rules;
  if (cur.includes(opt)) return { next: cur.filter((x) => x !== opt), limited: false };
  if (opt === exclusive) return { next: [opt], limited: false };
  const rest = cur.filter((x) => x !== exclusive);
  if (max !== undefined && rest.length >= max) return { next: cur, limited: true };
  return { next: [...rest, opt], limited: false };
}

export function shuffle<T>(xs: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}
