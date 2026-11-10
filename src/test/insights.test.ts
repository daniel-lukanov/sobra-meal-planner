import { describe, expect, it } from "vitest";
import { newSession, referralFrom, type ExperimentSession } from "@/lib/experiment-types";
import { ctaTable, isBounce, kpis, painRanking, statusOf } from "@/lib/insights";
import { normalizePasscode } from "@/lib/experiment.functions";
import { getMockExperimentData } from "@/data/mockExperimentData";
import { painOptions } from "@/data/survey";

const row = (p: Partial<ExperimentSession>) => ({ ...newSession(), ...p });

describe("founder insights", () => {
  it("ships 32 sample responses, all Stage 1 complete and 24 with the bonus", () => {
    const m = getMockExperimentData();
    expect(m).toHaveLength(32);
    expect(m.every((r) => r.survey_post_completed)).toBe(true);
    expect(m.filter((r) => r.bonus_completed)).toHaveLength(24);
  });
  it("counts CTA conversion only for primary button clicks", () => {
    expect(kpis([row({ cta_converted: true }), row({ cta_converted: false }), row({ cta_converted: null }), row({ cta_converted: true })]).ctaConversion).toBe(50);
  });
  it("PMF score is the share answering Very disappointed", () => {
    const rows = [row({ survey_post_completed: true, q8_pmf_score: "Very disappointed (I really want this)" }), row({ survey_post_completed: true, q8_pmf_score: "Not disappointed" })];
    expect(kpis(rows).pmf).toBe(50);
  });
  it("splits the offer test three ways", () => {
    const rows = [row({ ab_cta_variant: "C3_paid_399_household", contact_left: true }), row({ ab_cta_variant: "C3_paid_399_household" })];
    const t = ctaTable(rows);
    expect(t).toHaveLength(3);
    expect(t[2]!.contact).toBe(50);
    expect(t[0]!.n).toBe(0);
  });
  it("ranks pain #1 picks double #2 picks", () => {
    const rows = [row({ q3_pain_1: painOptions[1]!, q3_pain_2: painOptions[0]! })];
    expect(painRanking(rows, painOptions)[0]!.label).toBe(painOptions[1]);
  });
  it("reads ?ref= then ?utm_source=, defaulting to direct_link", () => {
    expect(referralFrom("?ref=Martin")).toBe("martin");
    expect(referralFrom("?utm_source=ig")).toBe("ig");
    expect(referralFrom("")).toBe("direct_link");
  });
  it("assigns each new visitor one of three offers", () => {
    expect(newSession("x", () => 0.1).ab_cta_variant).toBe("C1_free_receipt_cashback");
    expect(newSession("x", () => 0.5).ab_cta_variant).toBe("C2_paid_199_student");
    expect(newSession("x", () => 0.9).ab_cta_variant).toBe("C3_paid_399_household");
  });
});


describe("bounce cleanup rules", () => {
  it("an untouched session is an empty bounce", () => {
    const s = newSession();
    expect(isBounce(s)).toBe(true);
    expect(statusOf(s)).toBe("Empty Bounce");
  });
  it("one finished task means it is not a bounce", () => {
    expect(isBounce({ ...newSession(), task_3_deals: true })).toBe(false);
  });
  it("finishing the welcome survey means it is not a bounce", () => {
    expect(isBounce({ ...newSession(), survey_pre_completed: true })).toBe(false);
  });
  it("the passcode v6ventures67 matches regardless of case", () => {
    expect(normalizePasscode("V6Ventures67")).toBe(normalizePasscode("v6ventures67"));
  });
});
