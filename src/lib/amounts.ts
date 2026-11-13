// Amounts in the units the database uses (g, ml, pieces), shown the way people read them (1.2 kg, 250 ml, 6 pcs).
const trim = (n: number) => String(Math.round(n * 10) / 10).replace(/\.0$/, "");

export function formatAmount(qty: number, unit: string): string {
  if (unit === "ml") return qty >= 1000 ? `${trim(qty / 1000)} L` : `${trim(qty)} ml`;
  if (unit === "piece") return `${trim(qty)} ${Math.round(qty) === 1 ? "pc" : "pcs"}`;
  return qty >= 1000 ? `${trim(qty / 1000)} kg` : `${trim(qty)} g`;
}

/** The units a person can type an amount in, and what each is worth in the base unit. */
export function unitChoices(base: string): { label: string; factor: number }[] {
  if (base === "ml") return [{ label: "ml", factor: 1 }, { label: "L", factor: 1000 }];
  if (base === "piece") return [{ label: "pcs", factor: 1 }];
  return [{ label: "g", factor: 1 }, { label: "kg", factor: 1000 }];
}

/** An amount typed in some unit, in the base unit; null when it is not a usable number. */
export function toBase(value: string, factor: number): number | null {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * factor * 100) / 100 : null;
}
