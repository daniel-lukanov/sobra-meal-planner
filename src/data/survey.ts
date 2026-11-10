import type { StoreName } from "./stores";

export const householdOptions = ["Just me (1 person)", "2 people (partner or flatmate)", "3+ people", "I rarely cook"];
export const fallbackOptions = ["0 nights", "1–2 nights", "3–4 nights", "5+ nights"];
export const painOptions = [
  "Deciding what to cook every single day (decision fatigue)",
  "Cooking from scratch takes too much time after class or work",
  "Spending too much at the checkout or buying impulse items",
  "Finding half-used packs (spinach, meat, veg) expired in the fridge",
  "Checking flyers and apps to see which supermarket deals are real",
];
export const painShort: Record<string, string> = {
  [painOptions[0]!]: "Deciding what to cook",
  [painOptions[1]!]: "Not enough time",
  [painOptions[2]!]: "Overspending at checkout",
  [painOptions[3]!]: "Food expiring in the fridge",
  [painOptions[4]!]: "Telling real deals from fake",
};
export const workaroundOptions = ["No list, decide in store", "Apple Notes / WhatsApp list", "Cook one big pot for 3 days", "ChatGPT, TikTok saves or an app"];
export const storeOptions: StoreName[] = ["Pingo Doce", "Continente", "Lidl", "Aldi", "Auchan"];
export const spendOptions = ["Under €30", "€30–€45", "€45–€65", "Over €65"];
export const featureOptions = [
  "Weekly prep: cooking base ingredients once on Sunday for 3 different dinners",
  "Daily pick: 3 quick 20-min dinners tonight using expiring fridge items",
  "Honest deals: filtering out fake discounts against regular prices",
  "Receipt smart fridge: scanning receipts to track expiry dates with zero typing",
];
export const receiptOptions = [
  "Yes, automatic fridge tracking and expiry alerts are enough",
  "Only if scanning gives me €0.50 to €2.00 cashback on featured brands",
  "No, I never keep paper receipts",
];
export const shortLabel = (s: string) => painShort[s] ?? s.split(":")[0]!;
