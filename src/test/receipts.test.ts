import { describe, expect, it } from "vitest";
import { addReceipt, findDuplicate, removeReceipt, restoreReceipt, type Stock } from "@/lib/receipts";
import { sampleReceipt } from "@/data/fridge";

const empty: Stock = { fridge: [], receipts: [] };

describe("receipts", () => {
  it("adds the receipt's items to the fridge", () => {
    const s = addReceipt(empty, sampleReceipt, 1, "r-1");
    expect(s.fridge.map((f) => f.id)).toEqual(["carrots", "chickpeas", "peppers", "rice"]);
    expect(s.fridge.every((f) => f.receiptId === "r-1")).toBe(true);
  });
  it("removing a receipt takes its items out and leaves the rest", () => {
    const base: Stock = { fridge: [{ id: "eggs", name: "Eggs", daysLeft: 14, maxDays: 28 }], receipts: [] };
    const s = removeReceipt(addReceipt(base, sampleReceipt, 1, "r-1"), "r-1");
    expect(s.fridge.map((f) => f.id)).toEqual(["eggs"]);
    expect(s.receipts).toHaveLength(0);
  });
  it("a duplicate is found, and removing it keeps the first receipt's items", () => {
    const a = addReceipt(empty, sampleReceipt, 1, "r-1");
    expect(findDuplicate(a.receipts, sampleReceipt)).toBeDefined();
    const b = addReceipt(a, sampleReceipt, 2, "r-2");
    expect(b.fridge).toHaveLength(8);
    const c = removeReceipt(b, "r-2");
    expect(c.fridge).toHaveLength(4);
    expect(c.fridge.every((f) => f.receiptId === "r-1")).toBe(true);
  });
  it("undo puts the receipt and items back", () => {
    const a = addReceipt(empty, sampleReceipt, 1, "r-1");
    const r = removeReceipt(a, "r-1");
    const back = restoreReceipt({ fridge: r.fridge, receipts: r.receipts }, r.removed!);
    expect(back.fridge).toHaveLength(4);
    expect(back.receipts).toHaveLength(1);
  });
  it("removing an unknown id changes nothing", () => {
    expect(removeReceipt(empty, "nope").removed).toBeNull();
  });
});
