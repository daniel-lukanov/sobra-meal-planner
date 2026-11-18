import { byId, SAVINGS_STORES, SECTIONS, storeIndex, type Basis, type Section, type SavingsStore } from "./prices";

/** One line of a receipt (or of the manual basket). `productId` is null when the line is not in our price list. An empty `name` means the translated product name is shown. */
export type Line = { id: string; productId: string | null; raw: string; name: string; price: number };

export type ItemResult = {
  line: Line;
  productId: string | null;
  section: Section | null;
  bestStore: SavingsStore | null;
  bestPrice: number;
  basis: Basis | null;
  paid: number;
  saving: number;
  /** True when the user already paid the best price (or the line cannot be compared). */
  alreadyBest: boolean;
  /** Position on the receipt, used to break ties. */
  order: number;
};

export type Result = {
  items: ItemResult[];
  total: number;
  saving: number;
  percent: number;
  monthly: number;
  baskets: { store: SavingsStore; total: number }[];
  cheapestStore: SavingsStore;
  cheapestBasket: number;
  userStore: SavingsStore;
  userIsCheapest: boolean;
  /** What the same basket saves in one trip at the cheapest store. */
  tripSaving: number;
  top: ItemResult[];
};

export const WEEKS_PER_MONTH = 4.33;
const cents = (n: number) => Math.round(n * 100) / 100;

export function compute(lines: readonly Line[], userStore: SavingsStore): Result {
  const items: ItemResult[] = lines.map((line, order) => {
    const prod = line.productId ? byId(line.productId) : undefined;
    if (!prod) return { line, productId: null, section: null, bestStore: null, bestPrice: line.price, basis: null, paid: line.price, saving: 0, alreadyBest: true, order };
    let bi = 0;
    prod.prices.forEach((c, i) => { if (c.price < prod.prices[bi]!.price) bi = i; });
    const best = prod.prices[bi]!;
    const saving = Math.max(0, cents(line.price - best.price));
    return { line, productId: prod.id, section: prod.section, bestStore: SAVINGS_STORES[bi]!, bestPrice: best.price, basis: best.basis, paid: line.price, saving, alreadyBest: saving === 0, order };
  });
  const total = cents(lines.reduce((s, l) => s + l.price, 0));
  const saving = cents(items.reduce((s, i) => s + i.saving, 0));
  const baskets = SAVINGS_STORES.map((store, si) => ({
    store,
    total: cents(lines.reduce((s, l) => { const prod = l.productId ? byId(l.productId) : undefined; return s + (prod ? prod.prices[si]!.price : l.price); }, 0)),
  }));
  let ci = 0;
  baskets.forEach((x, i) => { if (x.total < baskets[ci]!.total) ci = i; });
  const cheapest = baskets[ci]!;
  const own = baskets[Math.max(0, storeIndex(userStore))]!;
  const userIsCheapest = cheapest.store === userStore || cheapest.total >= own.total;
  const top = items.filter((i) => i.saving > 0).sort((a, b) => b.saving - a.saving || a.order - b.order).slice(0, 5);
  return {
    items, total, saving, percent: total > 0 ? Math.round((saving / total) * 100) : 0, monthly: Math.round(saving * WEEKS_PER_MONTH),
    baskets, cheapestStore: cheapest.store, cheapestBasket: cheapest.total, userStore, userIsCheapest,
    tripSaving: userIsCheapest ? 0 : cents(own.total - cheapest.total), top,
  };
}

/** Builds the manual basket: each picked product at the price of the user's usual store. */
export function manualLines(ids: readonly string[], userStore: SavingsStore, nameOf: (id: string) => string): Line[] {
  const si = Math.max(0, storeIndex(userStore));
  return ids.flatMap((id, n) => {
    const prod = byId(id);
    return prod ? [{ id: `m${n}`, productId: id, raw: prod.raw, name: nameOf(id), price: prod.prices[si]!.price }] : [];
  });
}

export type ListGroup = { store: SavingsStore; sections: { section: Section; items: ItemResult[] }[]; total: number; saving: number };

/** The shopping list: every product at the store where it is cheapest, grouped by store and then by section. */
export function shoppingList(res: Result): ListGroup[] {
  const by = new Map<SavingsStore, ItemResult[]>();
  for (const it of res.items) {
    if (!it.productId || !it.bestStore) continue;
    // Already at the best price at the user's own store: keep it there.
    const own = byId(it.productId)!.prices[storeIndex(res.userStore)]!.price;
    const store = own <= it.bestPrice ? res.userStore : it.bestStore;
    by.set(store, [...(by.get(store) ?? []), it]);
  }
  return SAVINGS_STORES.filter((s) => by.has(s)).map((store) => {
    const its = by.get(store)!;
    return {
      store,
      sections: SECTIONS.map((section) => ({ section, items: its.filter((i) => i.section === section) })).filter((g) => g.items.length > 0),
      total: cents(its.reduce((s, i) => s + i.bestPrice, 0)),
      saving: cents(its.reduce((s, i) => s + i.saving, 0)),
    };
  });
}

/** ISO year-week, used to allow one free list per week. */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7)}`;
}
