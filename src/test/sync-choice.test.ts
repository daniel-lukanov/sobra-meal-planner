import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS } from "@/lib/prefs";
import { initialFridge } from "@/data/fridge";
import { decide, fridgeTouched, localHasData, prefsRowUsed, type LocalSnapshot, type RemoteSummary } from "@/lib/sync-choice";

const fresh: LocalSnapshot = { fridge: initialFridge, receipts: [], chosen: {}, weekAccepted: false, have: [], stores: ["Pingo Doce"], prefs: DEFAULT_PREFS, mode: "prep", meals: [], syncedFor: null };
const empty: RemoteSummary = { prefs: false, fridgeItems: 0, receipts: 0, plan: false, planUsed: false };
const full: RemoteSummary = { prefs: true, fridgeItems: 3, receipts: 0, plan: true, planUsed: true };
const used: LocalSnapshot = { ...fresh, prefs: { ...DEFAULT_PREFS, allergens: ["eggs"] } };

describe("what counts as data", () => {
  it("the demo fridge is not data until it is changed", () => {
    expect(fridgeTouched(initialFridge)).toBe(false);
    expect(fridgeTouched(initialFridge.slice(1))).toBe(true);
    expect(fridgeTouched([...initialFridge, { ...initialFridge[0]!, uid: "x", name: "Milk", id: "milk" }])).toBe(true);
    expect(localHasData({ ...fresh, fridge: initialFridge.slice(1) })).toBe(true);
  });
  it("a settings row equal to the starting settings is not data", () => {
    expect(prefsRowUsed(null)).toBe(false);
    expect(prefsRowUsed({ lifestyle: "none", proteins: DEFAULT_PREFS.proteins, allergens: [], goals: [] })).toBe(false);
    expect(prefsRowUsed({ lifestyle: "none", proteins: DEFAULT_PREFS.proteins, allergens: ["eggs"], goals: [] })).toBe(true);
    expect(prefsRowUsed({ lifestyle: "vegan", proteins: [], allergens: [], goals: [] })).toBe(true);
  });
});

describe("what happens to this device's data on login", () => {
  it("the starting state is not data", () => { expect(localHasData(fresh)).toBe(false); });
  it("any change the person made counts as data", () => {
    expect(localHasData(used)).toBe(true);
    expect(localHasData({ ...fresh, stores: ["Lidl"] })).toBe(true);
    expect(localHasData({ ...fresh, chosen: { 1: "Soup" } })).toBe(true);
    expect(localHasData({ ...fresh, have: ["rice"] })).toBe(true);
  });
  it("a new account takes this device's data without asking", () => { expect(decide("u1", used, empty)).toBe("device"); });
  it("an account with data and an untouched device takes the account's", () => { expect(decide("u1", fresh, full)).toBe("account"); });
  it("data on both sides asks", () => { expect(decide("u1", used, full)).toBe("ask"); });
  it("a device already matched with this account does not ask again", () => { expect(decide("u1", { ...used, syncedFor: "u1" }, full)).toBe("account"); });
  it("a device matched with another account asks", () => { expect(decide("u1", { ...used, syncedFor: "u2" }, full)).toBe("ask"); });
});
