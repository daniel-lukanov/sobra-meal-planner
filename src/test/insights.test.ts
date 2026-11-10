import { describe, expect, it } from "vitest";
import { newSession } from "@/lib/experiment-types";
import { ctaTable, kpis, planTable } from "@/lib/insights";
import { getMockExperimentData } from "@/data/mockExperimentData";

const row = (p: Parameters<typeof Object.assign>[1]) => Object.assign(newSession(), p);

describe("founder insights", () => {
  it("ships exactly 28 sample student responses", () => {
    expect(getMockExperimentData()).toHaveLength(28);
  });
  it("counts CTA conversion only for primary button clicks", () => {
    const rows = [row({ cta_converted: true }), row({ cta_converted: false }), row({ cta_converted: null }), row({ cta_converted: true })];
    expect(kpis(rows).ctaConversion).toBe(50);
  });
  it("splits plan acceptance by product variant", () => {
    const rows = [
      row({ ab_plan_variant: "A_weekly_prep", accepted_week_clicked: true }),
      row({ ab_plan_variant: "A_weekly_prep", accepted_week_clicked: false }),
      row({ ab_plan_variant: "B_daily_pick", accepted_week_clicked: true }),
    ];
    const [a, b] = planTable(rows);
    expect(a!.acceptance).toBe(50);
    expect(b!.acceptance).toBe(100);
  });
  it("splits contact left by business model variant", () => {
    const rows = [row({ ab_cta_variant: "2_student_paid_pass", contact_left: true }), row({ ab_cta_variant: "2_student_paid_pass" })];
    expect(ctaTable(rows)[1]!.contact).toBe(50);
    expect(ctaTable(rows)[0]!.n).toBe(0);
  });
});
