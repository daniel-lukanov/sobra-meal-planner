import { byId, DEMO_RECEIPT, SAVINGS_STORES, storeIndex, type SavingsStore } from "./prices";
import type { Line } from "./engine";

/** The sample receipt every photo resolves to in this prototype. */
export function sampleLines(): Line[] {
  return DEMO_RECEIPT.productIds.map((id, n) => ({ id: `r${n}`, productId: id, raw: byId(id)!.raw, name: "", price: byId(id)!.prices[storeIndex(DEMO_RECEIPT.store)]!.price }));
}
export const sampleMeta = { place: DEMO_RECEIPT.place, date: DEMO_RECEIPT.date, time: DEMO_RECEIPT.time };
export const asStore = (s: string | null | undefined): SavingsStore => (SAVINGS_STORES.find((x) => x === s) ?? "Pingo Doce");
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const photoReadable = (f: File) => f.type.startsWith("image/") && f.size > 0 && f.size <= MAX_PHOTO_BYTES;
