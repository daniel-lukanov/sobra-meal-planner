import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { parseSales, parseOffers } from "../../db/scripts/aldi";

describe("aldi parseSales", () => {
  it("reads pack sizes", () => {
    expect(parseSales("500 g embalagem - 500 g")).toEqual({ qty: 500, unit: "g" });
    expect(parseSales("kg - 1000 g")).toEqual({ qty: 1000, unit: "g" });
    expect(parseSales("1.5 l unidade")).toEqual({ qty: 1500, unit: "ml" });
    expect(parseSales("80 g unidade")).toEqual({ qty: 80, unit: "g" });
  });
});
const f = "data/raw/aldi/aldi_oportunidades.html";
describe.skipIf(!existsSync(f))("aldi saved page", () => {
  it("parses offers valid in the saved week", () => {
    const { items } = parseOffers(readFileSync(f, "utf8"), Date.parse("2026-11-18T12:00:00Z") / 1000);
    expect(items.length).toBeGreaterThan(50);
    expect(items.every((i) => i.price > 0 && i.packQty > 0)).toBe(true);
    expect(items.some((i) => i.was)).toBe(true);
  });
});
