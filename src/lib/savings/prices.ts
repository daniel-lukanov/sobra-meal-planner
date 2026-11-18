/**
 * SAMPLE PRICES for the savings prototype. Everything price-related lives in this one file.
 * To switch to real scraped offers later, replace `CATALOGUE` (or build it from the offers table); nothing else needs to change.
 * Store order in every `prices` array: Pingo Doce, Continente, Lidl, Aldi, Auchan.
 */
export const SAVINGS_STORES = ["Pingo Doce", "Continente", "Lidl", "Aldi", "Auchan"] as const;
export type SavingsStore = (typeof SAVINGS_STORES)[number];

export type Section = "veg" | "meat" | "dairy" | "pantry" | "household";
export const SECTIONS: readonly Section[] = ["veg", "meat", "dairy", "pantry", "household"];

/** How a price came about at one store. */
export type Basis = "promo" | "store_brand" | "regular";

export type Cell = { price: number; basis: Basis };
export type Product = {
  id: string;
  /** Text as printed on a Portuguese receipt. */
  raw: string;
  section: Section;
  /** One cell per store, in SAVINGS_STORES order. */
  prices: readonly [Cell, Cell, Cell, Cell, Cell];
};

const r = (price: number): Cell => ({ price, basis: "regular" });
const p = (price: number): Cell => ({ price, basis: "promo" });
const b = (price: number): Cell => ({ price, basis: "store_brand" });

export const CATALOGUE: readonly Product[] = [
  { id: "chicken", raw: "PEITO FRANGO 1KG", section: "meat", prices: [r(6.49), p(4.99), r(5.79), r(5.99), r(6.19)] },
  { id: "beef", raw: "CARNE PICADA BOV 500G", section: "meat", prices: [r(4.99), r(4.69), p(3.79), r(3.99), r(4.49)] },
  { id: "salmon", raw: "FIL SALMAO 400G", section: "meat", prices: [r(7.99), r(7.49), p(5.99), r(6.99), r(7.79)] },
  { id: "eggs", raw: "OVOS M 12UN", section: "dairy", prices: [r(3.29), r(3.19), r(2.89), r(2.59), r(3.09)] },
  { id: "milk", raw: "LEITE M/G 6X1L", section: "dairy", prices: [r(5.94), p(4.74), r(5.34), r(5.4), r(5.7)] },
  { id: "yogurt", raw: "IOG GREGO 4X120G", section: "dairy", prices: [p(2.79), r(2.99), r(2.89), r(2.95), r(3.09)] },
  { id: "coffee", raw: "CAFE MOIDO 250G", section: "pantry", prices: [r(3.99), r(3.79), r(3.49), r(3.59), p(2.99)] },
  { id: "olive_oil", raw: "AZEITE V EXTRA 750ML", section: "pantry", prices: [r(7.49), r(6.99), p(5.49), r(6.49), r(7.19)] },
  { id: "spaghetti", raw: "ESPARGUETE 500G", section: "pantry", prices: [r(1.29), r(0.99), b(0.79), r(0.85), r(1.09)] },
  { id: "detergent", raw: "DET ROUPA 40D", section: "household", prices: [r(9.99), r(7.99), r(8.49), r(8.99), p(5.99)] },
  // Extra usual products for the "pick what you usually buy" path.
  { id: "bananas", raw: "BANANA 1KG", section: "veg", prices: [r(1.39), r(1.29), p(0.99), r(1.19), r(1.35)] },
  { id: "tomatoes", raw: "TOMATE 1KG", section: "veg", prices: [r(2.49), r(2.29), r(1.99), p(1.69), r(2.39)] },
  { id: "bread", raw: "PAO FORMA 600G", section: "pantry", prices: [r(1.69), r(1.59), b(1.19), r(1.29), r(1.55)] },
  { id: "rice", raw: "ARROZ AGULHA 1KG", section: "pantry", prices: [r(1.39), r(1.25), b(0.95), r(1.09), r(1.29)] },
  { id: "toilet_paper", raw: "PAPEL HIG 12 ROLOS", section: "household", prices: [r(5.49), p(3.99), r(4.29), r(4.49), r(4.99)] },
];

/** The example receipt: what someone paid at Pingo Doce. Totals 54.25. */
export const DEMO_RECEIPT = {
  store: "Pingo Doce" as SavingsStore,
  place: "Lisboa Alvalade",
  date: "15/11/2026",
  time: "18:42",
  productIds: ["chicken", "beef", "salmon", "eggs", "milk", "yogurt", "coffee", "olive_oil", "spaghetti", "detergent"] as const,
};

/** Products offered as chips on the manual screen. */
export const MANUAL_CHIPS: readonly string[] = ["chicken", "beef", "salmon", "eggs", "milk", "yogurt", "coffee", "olive_oil", "spaghetti", "detergent", "bananas", "tomatoes", "bread", "rice", "toilet_paper"];

export const PRICE_NOTE_EN = "Sample prices, no guarantee.";
export const byId = (id: string) => CATALOGUE.find((x) => x.id === id);
export const storeIndex = (s: string) => SAVINGS_STORES.indexOf(s as SavingsStore);
