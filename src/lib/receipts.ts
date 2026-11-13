// Receipts and the fridge stock they create. Pure functions: the fridge is the stock, each receipt adds its items to it,
// and removing a receipt takes exactly those items out again (a second receipt with the same item keeps its own copy).
import type { FridgeItem, Receipt } from "@/data/fridge";

export type Stock = { fridge: FridgeItem[]; receipts: Receipt[] };
export type ReceiptInput = { store: string; date: string; total: number; lines: [string, string][]; items: FridgeItem[] };

/** An already added receipt from the same shop, day and total: most likely the same paper receipt added twice. */
export const findDuplicate = (receipts: Receipt[], r: { store: string; date: string; total: number }) =>
  receipts.find((x) => x.store === r.store && x.date === r.date && Math.abs(x.total - r.total) < 0.005);

export const itemsOf = (fridge: FridgeItem[], receiptId: string) => fridge.filter((f) => f.receiptId === receiptId);

export function addReceipt(s: Stock, r: ReceiptInput, now = Date.now(), id: string = crypto.randomUUID()): Stock & { receipt: Receipt } {
  const receipt: Receipt = { id, store: r.store, date: r.date, total: r.total, lines: r.lines, addedAt: now };
  const items = r.items.map((i) => ({ ...i, isNew: true, receiptId: receipt.id, uid: crypto.randomUUID() }));
  return { fridge: [...items, ...s.fridge], receipts: [receipt, ...s.receipts], receipt };
}

export function removeReceipt(s: Stock, id: string): Stock & { removed: { receipt: Receipt; items: FridgeItem[] } | null } {
  const receipt = s.receipts.find((r) => r.id === id);
  if (!receipt) return { ...s, removed: null };
  return { fridge: s.fridge.filter((f) => f.receiptId !== id), receipts: s.receipts.filter((r) => r.id !== id), removed: { receipt, items: itemsOf(s.fridge, id) } };
}

/** Undo for removeReceipt. */
export const restoreReceipt = (s: Stock, removed: { receipt: Receipt; items: FridgeItem[] }): Stock => (
  s.receipts.some((r) => r.id === removed.receipt.id) ? s
    : { fridge: [...removed.items, ...s.fridge], receipts: [removed.receipt, ...s.receipts].sort((a, b) => b.addedAt - a.addedAt) });
