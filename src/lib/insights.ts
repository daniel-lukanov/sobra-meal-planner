import type { ExperimentSession } from "./experiment-types";
import { shortLabel } from "@/data/survey";

type R = ExperimentSession;
export const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 100));
const share = (rows: R[], f: (r: R) => boolean) => pct(rows.filter(f).length, rows.length);

export function kpis(rows: R[]) {
  const pre = rows.filter((r) => r.survey_pre_completed);
  const pains = distribution(rows, "top_pain");
  return {
    n: rows.length,
    completion: share(rows, (r) => r.survey_pre_completed),
    ctaConversion: share(rows, (r) => r.cta_converted === true),
    avgTime: rows.length ? Math.round(rows.reduce((a, r) => a + r.time_spent_seconds, 0) / rows.length) : 0,
    topPain: pains[0] ? { label: shortLabel(pains[0].label), pct: pains[0].pct } : null,
    preCount: pre.length,
  };
}

/** Counts answers for one question; percentages are of people who answered it. */
export function distribution(rows: R[], key: keyof R, options?: string[]) {
  const counts = new Map<string, number>();
  options?.forEach((o) => counts.set(o, 0));
  let answered = 0;
  for (const r of rows) {
    const v = r[key];
    if (typeof v !== "string" || !v) continue;
    answered++;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const out = [...counts].map(([label, count]) => ({ label, count, pct: pct(count, answered) }));
  return options ? out : out.sort((a, b) => b.count - a.count);
}

export function planTable(rows: R[]) {
  return (["A_weekly_prep", "B_daily_pick"] as const).map((v) => {
    const g = rows.filter((r) => r.ab_plan_variant === v);
    return {
      variant: v,
      n: g.length,
      acceptance: share(g, (r) => r.accepted_week_clicked),
      switched: share(g, (r) => r.initial_mode_switched),
      synergy: share(g, (r) => r.synergy_filter_used),
      conversion: share(g, (r) => r.cta_converted === true),
    };
  });
}

export function ctaTable(rows: R[]) {
  return (["1_receipt_cashback", "2_student_paid_pass"] as const).map((v) => {
    const g = rows.filter((r) => r.ab_cta_variant === v);
    return { variant: v, n: g.length, primary: share(g, (r) => r.cta_converted === true), contact: share(g, (r) => r.contact_left) };
  });
}

const csvCols: (keyof R)[] = [
  "session_id", "created_at", "ab_plan_variant", "ab_cta_variant", "survey_pre_completed", "household_size", "fallback_nights", "top_pain",
  "current_workaround", "preferred_store", "weekly_spend", "initial_mode_switched", "accepted_week_clicked", "synergy_filter_used",
  "swapped_meal_clicked", "deals_tab_visited", "fridge_receipt_scanned", "cook_tab_visited", "time_spent_seconds", "survey_post_completed",
  "winning_feature", "receipt_willingness", "open_feedback", "cta_converted", "contact_left",
];
export function toCSV(rows: R[]) {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [csvCols.join(","), ...rows.map((r) => csvCols.map((c) => esc(r[c])).join(","))].join("\n");
}
