import { describe, expect, it } from "vitest";
import { formatAmount, toBase, unitChoices } from "@/lib/amounts";

describe("amounts", () => {
  it("shows grams, kilograms, millilitres, litres and pieces the way people read them", () => {
    expect(formatAmount(300, "g")).toBe("300 g");
    expect(formatAmount(1000, "g")).toBe("1 kg");
    expect(formatAmount(1200, "g")).toBe("1.2 kg");
    expect(formatAmount(250, "ml")).toBe("250 ml");
    expect(formatAmount(1500, "ml")).toBe("1.5 L");
    expect(formatAmount(1, "piece")).toBe("1 pc");
    expect(formatAmount(6, "piece")).toBe("6 pcs");
  });
  it("turns typed amounts back into the base unit", () => {
    expect(toBase("1,5", 1000)).toBe(1500);
    expect(toBase("300", 1)).toBe(300);
    expect(toBase("", 1)).toBeNull();
    expect(toBase("-2", 1)).toBeNull();
    expect(unitChoices("ml").map((u) => u.label)).toEqual(["ml", "L"]);
  });
});
