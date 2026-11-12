import { describe, expect, it } from "vitest";
import { applyEvent, attributionFrom, newSession, type ExperimentSession } from "@/lib/experiment-types";
import { activation, costPerTester, funnel, isBounce } from "@/lib/insights";
import { normalizePasscode } from "@/lib/experiment.functions";
import { PAIN_NONE, toggleMulti } from "@/data/survey";
import { alternatives, neededItems, perPerson, shareText, weekCards, weekTotal } from "@/lib/week";

const row = (p: Partial<ExperimentSession> = {}) => ({ ...newSession(), ...p });

describe("survey rules", () => {
  it("lets you pick at most 2 pains", () => {
    expect(toggleMulti(["a", "b"], "c", { max: 2, exclusive: PAIN_NONE })).toEqual({ next: ["a", "b"], limited: true });
  });
  it("None of these clears the others, and another option clears None", () => {
    expect(toggleMulti(["a", "b"], PAIN_NONE, { max: 2, exclusive: PAIN_NONE }).next).toEqual([PAIN_NONE]);
    expect(toggleMulti([PAIN_NONE], "a", { max: 2, exclusive: PAIN_NONE }).next).toEqual(["a"]);
  });
  it("defaults utm_source to direct", () => {
    expect(attributionFrom("").utm_source).toBe("direct");
    expect(attributionFrom("?ref=ab12&utm_source=instagram&utm_content=post2")).toEqual({ ref: "ab12", utm_source: "instagram", utm_content: "post2" });
  });
  it("assigns only the two CTA variants", () => {
    expect(["free_pilot", "paid_199"]).toContain(newSession().ab_cta_variant);
  });
});

describe("tracking", () => {
  it("marks an accept during tour step 1 as in_tour, and outside the tour as voluntary", () => {
    const guided = applyEvent(row(), "accepted_week_clicked", 1);
    const own = applyEvent(row(), "accepted_week_clicked", null);
    expect(guided.events[0]!.in_tour).toBe(true);
    expect(own.events[0]!.in_tour).toBe(false);
    const a = activation([guided, own]);
    expect(a.voluntary).toBe(50);
    expect(a.withTour).toBe(100);
  });
  it("only counts referral sign-ups as sign-ups", () => {
    const visited = row({ ref: "x", utm_source: "whatsapp_share", survey_pre_completed: true });
    const signed = applyEvent(visited, "referral_signup", null);
    expect(funnel([visited, signed]).at(-1)!.count).toBe(1);
  });
  it("treats a session with no Block 1 and no actions as a bounce", () => {
    expect(isBounce(row())).toBe(true);
    expect(isBounce(applyEvent(row(), "swap", null))).toBe(false);
  });
  it("divides spend by Block 1 completions", () => {
    const c = costPerTester([row({ survey_pre_completed: true }), row({ survey_pre_completed: true }), row()], [{ channel: "instagram", amount: 10 }]);
    expect(c.cpa).toBe(5);
  });
  it("normalizes the passcode", () => expect(normalizePasscode("  V6Ventures67 ")).toBe("v6ventures67"));
});

describe("plan", () => {
  it("starts at €11.85 for 6 dinners", () => {
    expect(weekCards({}).length).toBe(6);
    expect(weekTotal(weekCards({}))).toBe(11.85);
  });
  it("swapping a dinner changes the total and shopping list", () => {
    const alt = alternatives(1, {}, ["Meat", "Fish"]);
    expect(alt.length).toBeGreaterThan(0);
    expect(alt.length).toBeLessThanOrEqual(3);
    const chosen = { 1: "Chicken fried rice" };
    expect(weekTotal(weekCards(chosen))).toBe(11.65);
    expect(neededItems(weekCards(chosen)).find((i) => i.id === "rice")!.dinners).toBe(3);
  });
  it("never offers meat to a vegetarian", () => {
    expect(alternatives(1, {}, ["Vegetarian"]).some((m) => m.uses.includes("chicken") || m.uses.includes("tuna"))).toBe(false);
  });
  it("splits the share text per person and drops the link when it failed", () => {
    expect(perPerson(11.85, 2)).toBe(5.93);
    const t = shareText({ store: "Lidl", dinners: [{ day: "Mon", title: "Soup" }], total: 11.85, people: 2, items: ["Carrots"], link: null });
    expect(t).toContain("€5.93 each if we split between 2 people");
    expect(t).not.toContain("Open the plan");
    expect(t).toContain("Sample prices, no guarantee.");
  });
});
