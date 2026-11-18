import { describe, expect, it } from "vitest";
import { newSession, applyEvent, type ExperimentSession } from "@/lib/experiment-types";
import { funnel3, onlyV3, questionChart, sharedPerWeek, referralStats } from "@/lib/insights-v3";
import { toCSV } from "@/lib/insights";

const base = () => newSession("");
describe("insights v3", () => {
  it("keeps only v3 sessions in the charts but old ones in the CSV", () => {
    const old = base();
    delete (old as { survey_version?: string | null }).survey_version;
    const fresh = base();
    expect(onlyV3([old, fresh])).toHaveLength(1);
    expect(toCSV([old, fresh]).split("\n")).toHaveLength(3);
    expect(toCSV([old]).includes("v2_mealplan")).toBe(true);
  });
  it("counts the funnel, shares per week and Q5b only for 'Nothing'", () => {
    let s: ExperimentSession = { ...base(), survey_pre_completed: true, b3_actions: ["nothing"], b3_action_blockers: ["far"] };
    s = applyEvent(s, "result_shown", null);
    s = applyEvent(s, "whatsapp_share_clicked", null, new Date("2026-11-18T10:00:00Z"));
    const other = { ...base(), b3_actions: ["split"], b3_action_blockers: ["far"] };
    expect(funnel3([s, other]).find((f) => f.label === "Result shown")!.count).toBe(1);
    expect(funnel3([s]).find((f) => f.label === "Shared")!.count).toBe(1);
    expect(sharedPerWeek([s])).toEqual([{ week: "2026-W47", count: 1 }]);
    expect(questionChart([s, other], "q5b").answered).toBe(1);
    expect(referralStats([s]).signups).toBe(0);
  });
});
