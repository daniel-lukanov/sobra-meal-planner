import type { StoreName } from "./stores";

export const householdOptions = ["Just myself (1 person)", "Me + partner (2 people)", "Me + flatmates (2–4 people)", "I rarely cook"];
export const fallbackOptions = ["0 nights", "1 night", "2 nights", "3 nights", "4 nights", "5+ nights"];
export const painOptions = [
  "Deciding what to cook every single night (decision fatigue)",
  "Cooking from scratch and cleaning takes too long after class/work",
  "Finding half-used packs (spinach, meat, veg) expired in the fridge",
  "Spending too much at checkout or buying impulse items",
  "Eating the exact same meal-prep leftover 3 days in a row",
];
export const painShort: Record<string, string> = {
  [painOptions[0]!]: "Deciding what to cook",
  [painOptions[1]!]: "Cooking and cleaning time",
  [painOptions[2]!]: "Food expiring in the fridge",
  [painOptions[3]!]: "Overspending at checkout",
  [painOptions[4]!]: "Leftover boredom",
};
export const workaroundOptions = ["No list, decide in store", "Apple Notes / WhatsApp list", "Saved TikTok / IG reels", "Cook one big pot for 3 days", "ChatGPT or a meal app"];
export const storeOptions: StoreName[] = ["Pingo Doce", "Continente", "Lidl", "Aldi", "Auchan"];

export const modeOptions = [
  "Weekly Prep (Cook base Sunday & Wednesday, 10-min dinners)",
  "Daily Pick (Pick 1 of 3 quick 20-min meals on the night)",
  "Both: Weekly Prep on normal weeks, Daily Pick during busy exam weeks",
];
export const receiptOptions = [
  "Snap a 5-second photo of my paper receipt after shopping",
  "Auto-move checked items from my Sobra shopping list into my fridge with 1 tap",
  "Only scan paper receipts if it gives me €0.50 to €2.00 cashback on brands",
  "I would not track my fridge",
];
export const pmfOptions = ["Very disappointed (I really want this)", "Somewhat disappointed", "Not disappointed"];

export const timingOptions = ["After 19:00 when already hungry", "Same day at the store", "1–2 days ahead", "Start of the week"];
export const switchOptions = ["Never, I only use my closest store", "To save €3–€5", "To save €6+", "I already shop at 2+ stores"];
export const wasteOptions = ["Spinach / salad / herbs", "Fresh meat / chicken / fish", "Vegetables", "Cooked leftovers", "Dairy / sauces", "None"];
export const synergyOptions = ["Love it — saves time without leftover boredom", "Good if Sunday prep is under 45 min", "Prefer cooking fresh every night", "Don't want the same base 3 days"];
export const featureKeys = ["synergy_prep", "verified_deals", "receipt_fridge", "reel_checker", "cook_mode"] as const;
export type FeatureKey = (typeof featureKeys)[number];
export const featureLabels: Record<FeatureKey, string> = {
  synergy_prep: "Synergy Weekly Prep",
  verified_deals: "Verified Real Deals (Fake Deal Filter)",
  receipt_fridge: "Receipt Smart Fridge",
  reel_checker: "Instagram/TikTok Reel Checker",
  cook_mode: "Step-by-Step Cook Mode & Timers",
};
export const wtpOptions = [
  "€0 — I would only use it if 100% free (funded by brand cashback & supermarket offers)",
  "Up to €1.99 / month (student coffee price)",
  "Up to €3.99 / month (if first month is free and savings are proven)",
  "Free app, but I would order my groceries via Continente Online / Glovo inside Sobra",
];
export const shortLabel = (s: string) => painShort[s] ?? s.split(/ \(| —|:/)[0]!;
