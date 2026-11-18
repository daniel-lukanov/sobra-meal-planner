import { describe, expect, it } from "vitest";
import { money, moneyWhole, STRINGS, translate } from "@/lib/i18n";
import { QUESTIONS, shownOrder, toggleMulti, optKey, qKey } from "@/lib/savings/survey";

describe("i18n", () => {
  it("formats money per language", () => {
    expect(money(14.1, "en")).toBe("€14.10");
    expect(money(14.1, "pt")).toBe("14,10 €");
    expect(moneyWhole(61.05, "pt")).toBe("61 €");
  });
  it("has every key in both languages and no banned characters", () => {
    for (const [k, v] of Object.entries(STRINGS.en)) {
      expect(STRINGS.pt[k as keyof typeof STRINGS.en], k).toBeTruthy();
      expect(v, k).not.toMatch(/—|→|seamless|effortless|unlock|empower|journey|leverage|elevate|game-changer|honest|in seconds/i);
    }
  });
  it("fills placeholders", () => { expect(translate("en", "res.paid", { price: "€1.00" })).toBe("you paid €1.00"); });
  it("has a label for every survey option", () => {
    for (const q of Object.values(QUESTIONS)) { expect(STRINGS.en[qKey(q.id)]).toBeTruthy(); for (const op of q.options) expect(STRINGS.pt[optKey(q.id, op.value)], `${q.id}.${op.value}`).toBeTruthy(); }
  });
});

describe("survey helpers", () => {
  it("keeps exclusive options last when shuffling", () => {
    for (let i = 0; i < 20; i++) expect(shownOrder(QUESTIONS.q3).at(-1)).toBe("none");
    expect(new Set(shownOrder(QUESTIONS.q9)).size).toBe(6);
  });
  it("exclusive options clear the others", () => {
    const q = QUESTIONS.q3;
    expect(toggleMulti(q, ["flyer", "grab"], "none")).toEqual(["none"]);
    expect(toggleMulti(q, ["none"], "flyer")).toEqual(["flyer"]);
    expect(toggleMulti(q, ["flyer"], "flyer")).toEqual([]);
  });
});
