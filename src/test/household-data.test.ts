import { describe, expect, it } from "vitest";
import { fridgeFromRow, fridgeKey, normalize, parseDate, formatDate, receiptFromRow, toFridgeRow, toReceiptRow } from "@/lib/household-data";

const U1 = "11111111-1111-4111-8111-111111111111", U2 = "22222222-2222-4222-8222-222222222222", H = "33333333-3333-4333-8333-333333333333";
const today = new Date(2026, 10, 13);

describe("household data mapping", () => {
  it("reads and writes receipt dates", () => {
    expect(parseDate("09/11/26")).toBe("2026-11-09");
    expect(formatDate("2026-11-09")).toBe("09/11/26");
    expect(parseDate("nonsense")).toBeNull();
  });
  it("round-trips a fridge item through a row", () => {
    const row = toFridgeRow({ id: "onions", name: "Onions", daysLeft: 18, maxDays: 30, uid: U1 }, { householdId: H, ingredientId: "ing-1", today });
    expect(row.expires_on).toBe("2026-12-01");
    const back = fridgeFromRow({ ...row, added_on: "2026-11-13", created_at: "", product_id: null, quantity: null, id: U1, household_id: H, ingredient_id: "ing-1", label: "Onions", state: "raw", source: "manual", expires_on: "2026-12-01", shelf_days: 30, receipt_id: null }, { slug: "onion", name: "Onions" }, today);
    expect(back).toMatchObject({ id: "onions", daysLeft: 18, maxDays: 30, uid: U1 });
  });
  it("counts days down from the expiry date", () => {
    const r = { id: U1, household_id: H, ingredient_id: "i", label: null, state: "raw", source: "receipt", expires_on: "2026-11-14", shelf_days: 5, receipt_id: null, added_on: "", created_at: "", product_id: null, quantity: null };
    expect(fridgeFromRow(r, { slug: "spinach", name: "Spinach" }, today).daysLeft).toBe(1);
    expect(fridgeFromRow({ ...r, expires_on: "2026-11-10" }, { slug: "spinach", name: "Spinach" }, today).daysLeft).toBe(0);
  });
  it("a changed expiry changes the key, an unchanged item does not", () => {
    const a = toFridgeRow({ id: "eggs", name: "Eggs", daysLeft: 14, maxDays: 28, uid: U1 }, { householdId: H, ingredientId: "i", today });
    expect(fridgeKey(a)).toBe(fridgeKey({ ...a }));
    expect(fridgeKey(a)).not.toBe(fridgeKey({ ...a, expires_on: "2026-11-20" }));
  });
  it("normalize gives old ids proper ones and keeps the links", () => {
    let n = 0; const ids = [U1, U2, H];
    const r = normalize([{ id: "rice", name: "Rice", daysLeft: null, maxDays: 1, receiptId: "r-1" }], [{ id: "r-1", store: "Lidl", date: "09/11/26", total: 4.96, lines: [], addedAt: 1 }], () => ids[n++]!);
    expect(r.changed).toBe(true);
    expect(r.receipts[0]!.id).toBe(U1);
    expect(r.fridge[0]).toMatchObject({ receiptId: U1, uid: U2 });
  });
  it("normalize leaves good data alone", () => {
    const f = [{ id: "rice", name: "Rice", daysLeft: null, maxDays: 1, uid: U1 }];
    expect(normalize(f, []).changed).toBe(false);
  });
  it("maps a receipt to the chain and back", () => {
    const row = toReceiptRow({ id: U1, store: "Lidl", date: "09/11/26", total: 4.96, lines: [], addedAt: 1 }, { householdId: H, userId: U2 });
    expect(row).toMatchObject({ chain_id: "lidl", purchased_on: "2026-11-09", total: 4.96 });
    expect(receiptFromRow({ ...row, id: U1, household_id: H, chain_id: "lidl", purchased_on: "2026-11-09", total: 4.96, created_by: U2, created_at: "2026-11-13T00:00:00Z" })).toMatchObject({ store: "Lidl", date: "09/11/26", total: 4.96 });
  });
});
