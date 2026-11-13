// Mapping between the app's fridge/receipt/plan state and the household tables. Pure, so it can be tested.
import type { FridgeItem, Receipt } from "@/data/fridge";
import type { StoreName } from "@/data/stores";
import type { Database } from "@/integrations/sobra-db/types";
import { CHAIN_OF } from "@/lib/deals-from-db";

type Tables = Database["public"]["Tables"];
export type FridgeRow = Tables["fridge_item"]["Row"];
export type ReceiptRow = Tables["receipt"]["Row"];
export type FridgeInsert = Tables["fridge_item"]["Insert"];
export type ReceiptInsert = Tables["receipt"]["Insert"];

/** Fridge item ids that differ from the ingredient slugs in the database. */
export const FRIDGE_SLUG: Record<string, string> = { onions: "onion" };
const LOCAL_ID = Object.fromEntries(Object.entries(FRIDGE_SLUG).map(([a, b]) => [b, a]));
const STORE_OF_CHAIN = Object.fromEntries(Object.entries(CHAIN_OF).map(([store, chain]) => [chain, store])) as Record<string, StoreName>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string | undefined): s is string => !!s && UUID.test(s);

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNumber = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Math.round(Date.UTC(y!, m! - 1, d!) / DAY); };
const todayNumber = (today: Date) => dayNumber(ymd(today));
const addDays = (today: Date, n: number) => ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));

/** "09/11/26" to "2026-11-09". */
export function parseDate(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s.trim());
  if (!m) return null;
  const y = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${y}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
}
/** "2026-11-09" to "09/11/26". */
export const formatDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y!.slice(2)}`; };

/** Gives every item and receipt a proper id, so rows can be matched. Returns the same arrays when nothing was missing. */
export function normalize(fridge: FridgeItem[], receipts: Receipt[], newId: () => string = () => crypto.randomUUID()) {
  const remap = new Map<string, string>();
  let changed = false;
  const rs = receipts.map((r) => {
    if (isUuid(r.id)) return r;
    const id = newId(); remap.set(r.id, id); changed = true;
    return { ...r, id };
  });
  const fs = fridge.map((f) => {
    const receiptId = f.receiptId ? remap.get(f.receiptId) ?? f.receiptId : undefined;
    if (isUuid(f.uid) && receiptId === f.receiptId) return f;
    changed = true;
    const { receiptId: _old, ...rest } = f;
    return { ...rest, uid: isUuid(f.uid) ? f.uid : newId(), ...(receiptId ? { receiptId } : {}) };
  });
  return changed ? { fridge: fs, receipts: rs, changed } : { fridge, receipts, changed };
}

const isCooked = (name: string) => /^(cooked|boiled)\b/i.test(name);

export function toFridgeRow(f: FridgeItem, c: { householdId: string; ingredientId: string; today: Date }): FridgeInsert {
  return {
    id: f.uid!, household_id: c.householdId, ingredient_id: c.ingredientId, label: f.name,
    state: isCooked(f.name) ? "cooked" : "raw", source: f.receiptId ? "receipt" : isCooked(f.name) ? "prep" : "manual",
    expires_on: f.daysLeft === null ? null : addDays(c.today, f.daysLeft), shelf_days: f.maxDays,
    receipt_id: f.receiptId && isUuid(f.receiptId) ? f.receiptId : null,
  };
}

export function fridgeFromRow(r: FridgeRow, ing: { slug: string; name: string } | undefined, today: Date): FridgeItem {
  const slug = ing?.slug ?? "unknown";
  const daysLeft = r.expires_on ? Math.max(0, dayNumber(r.expires_on) - todayNumber(today)) : null;
  return {
    id: LOCAL_ID[slug] ?? slug, name: r.label ?? ing?.name ?? slug, daysLeft, maxDays: r.shelf_days ?? Math.max(1, daysLeft ?? 1),
    uid: r.id, ...(r.receipt_id ? { receiptId: r.receipt_id } : {}),
  };
}

export const toReceiptRow = (r: Receipt, c: { householdId: string; userId: string }): ReceiptInsert => ({
  id: r.id, household_id: c.householdId, chain_id: (CHAIN_OF as Record<string, string>)[r.store] ?? null,
  purchased_on: parseDate(r.date), total: r.total, created_by: c.userId,
});

export const receiptFromRow = (r: ReceiptRow): Receipt => ({
  id: r.id, store: r.chain_id ? STORE_OF_CHAIN[r.chain_id] ?? r.chain_id : "Store", date: r.purchased_on ? formatDate(r.purchased_on) : "",
  total: Number(r.total ?? 0), lines: [], addedAt: Date.parse(r.created_at),
});

/** JSON with sorted keys, to compare two states without caring about key order. */
export const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/** The fields of a fridge row that matter for deciding whether it changed. */
export const fridgeKey = (r: FridgeInsert) => stable([r.ingredient_id, r.label, r.state, r.source, r.expires_on, r.shelf_days, r.receipt_id]);
export const receiptKey = (r: ReceiptInsert) => stable([r.chain_id, r.purchased_on, Number(r.total ?? 0)]);
