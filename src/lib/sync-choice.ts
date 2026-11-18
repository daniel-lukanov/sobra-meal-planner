// Decides what happens to this browser's data when someone signs up or logs in. Pure, tested in src/test/sync-choice.test.ts.
//  - nothing here or nothing in the account: the side with data wins, no question
//  - data on both sides and this browser was never matched with this account: ask
//  - this browser was already matched with the account: the account is the truth
import { DEFAULT_PREFS, type Prefs } from "@/lib/prefs";
import { initialFridge, type FridgeItem } from "@/data/fridge";

export type Choice = "account" | "device";
export type LocalSnapshot = { fridge: FridgeItem[]; receipts: unknown[]; chosen: Record<string, string>; weekAccepted: boolean; have: string[]; stores: string[]; prefs: Prefs; mode: string; meals: string[]; syncedFor: string | null };
/** `prefs`: the account holds settings that differ from the starting ones. */
export type RemoteSummary = { prefs: boolean; fridgeItems: number; receipts: number; plan: boolean; planUsed: boolean };

const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const fridgeKey = (l: FridgeItem[]) => JSON.stringify([...l].map((f) => [f.id, f.name, f.daysLeft, f.maxDays, f.qty ?? null, f.receiptId ?? null]).sort());
/** The demo fridge every visitor starts with. Once the person adds, removes or changes anything, the whole fridge is theirs. */
export const fridgeTouched = (l: FridgeItem[]) => fridgeKey(l) !== fridgeKey(initialFridge);

/** A saved settings row only counts as data when it differs from the starting settings. */
export function prefsRowUsed(r: { lifestyle: string; proteins: string[]; allergens: string[]; goals: string[] } | null): boolean {
  if (!r) return false;
  return r.lifestyle !== DEFAULT_PREFS.lifestyle || !same(r.proteins, DEFAULT_PREFS.proteins) || r.allergens.length > 0 || r.goals.length > 0;
}

/** Does this browser hold anything the person made, as opposed to the starting state? */
export function localHasData(l: LocalSnapshot): boolean {
  const d = DEFAULT_PREFS;
  return fridgeTouched(l.fridge) || l.receipts.length > 0 || Object.keys(l.chosen).length > 0 || l.weekAccepted || l.have.length > 0
    || l.prefs.lifestyle !== d.lifestyle || !same(l.prefs.proteins, d.proteins) || l.prefs.allergens.length > 0 || l.prefs.goals.length > 0
    || !same(l.stores, ["Pingo Doce"]);
}
export const remoteHasData = (r: RemoteSummary) => r.prefs || r.fridgeItems > 0 || r.receipts > 0 || r.planUsed;

export function decide(uid: string, l: LocalSnapshot, r: RemoteSummary): Choice | "ask" {
  if (l.syncedFor === uid) return "account";
  if (!remoteHasData(r)) return "device";
  if (!localHasData(l)) return "account";
  return "ask";
}
