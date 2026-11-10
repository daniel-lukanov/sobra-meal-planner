import { ctaVariants, framingVariants, planVariants, tasksDone, type ExperimentSession } from "./experiment-types";
import { featureKeys, shortLabel } from "@/data/survey";

type R = ExperimentSession;
export const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 100));
const share = (rows: R[], f: (r: R) => boolean) => pct(rows.filter(f).length, rows.length);

export function kpis(rows: R[]) {
  const post = rows.filter((r) => r.survey_post_completed);
  const pains = distribution(rows, "q3_pain_1");
  return {
    n: rows.length,
    stage1: share(rows, (r) => r.survey_post_completed),
    stage2: share(rows, (r) => r.bonus_completed),
    /** Sean Ellis: share of people who answered Q8 that would be very disappointed. */
    pmf: pct(post.filter((r) => r.q8_pmf_score?.startsWith("Very")).length, rows.filter((r) => r.q8_pmf_score).length),
    ctaConversion: share(rows, (r) => r.cta_converted === true),
    avgTasks: rows.length ? Math.round((rows.reduce((a, r) => a + tasksDone(r), 0) / rows.length) * 10) / 10 : 0,
    topPain: pains[0] ? { label: shortLabel(pains[0].label), pct: pains[0].pct } : null,
    preCount: rows.filter((r) => r.survey_pre_completed).length,
  };
}

/** Counts answers for one question; percentages are of people who answered it. */
export function distribution(rows: R[], key: keyof R, options?: readonly string[]) {
  const counts = new Map<string, number>();
  options?.forEach((o) => counts.set(o, 0));
  let answered = 0;
  for (const r of rows) {
    const v = r[key];
    const vals = Array.isArray(v) ? v : typeof v === "string" && v ? [v] : [];
    if (!vals.length) continue;
    answered++;
    for (const x of vals) counts.set(x, (counts.get(x) ?? 0) + 1);
  }
  const out = [...counts].map(([label, count]) => ({ label, count, pct: pct(count, answered) }));
  return options ? out : out.sort((a, b) => b.count - a.count);
}

/** Q3 ranking: #1 pick scores 2 points, #2 pick scores 1. */
export function painRanking(rows: R[], options: readonly string[]) {
  return options.map((o) => ({
    label: o,
    first: rows.filter((r) => r.q3_pain_1 === o).length,
    second: rows.filter((r) => r.q3_pain_2 === o).length,
  })).map((x) => ({ ...x, score: x.first * 2 + x.second })).sort((a, b) => b.score - a.score);
}

export function featureAverages(rows: R[]) {
  const done = rows.filter((r) => r.q13_buy_a_feature);
  return featureKeys.map((k) => ({ key: k, avg: done.length ? Math.round(done.reduce((a, r) => a + (r.q13_buy_a_feature?.[k] ?? 0), 0) / done.length) : 0 }));
}

export function planTable(rows: R[]) {
  return planVariants.map((v) => {
    const g = rows.filter((r) => r.ab_plan_variant === v);
    return { variant: v, n: g.length, acceptance: share(g, (r) => r.accepted_week_clicked), switched: share(g, (r) => r.initial_mode_switched), conversion: share(g, (r) => r.cta_converted === true) };
  });
}
export function framingTable(rows: R[]) {
  return framingVariants.map((v) => {
    const g = rows.filter((r) => r.ab_framing_variant === v);
    return { variant: v, n: g.length, acceptance: share(g, (r) => r.accepted_week_clicked), conversion: share(g, (r) => r.cta_converted === true), pmf: kpis(g).pmf };
  });
}
export function ctaTable(rows: R[]) {
  return ctaVariants.map((v) => {
    const g = rows.filter((r) => r.ab_cta_variant === v);
    return { variant: v, n: g.length, conversion: share(g, (r) => r.cta_converted === true), contact: share(g, (r) => r.contact_left), bonus: share(g, (r) => r.bonus_completed) };
  });
}
export function referrals(rows: R[]) {
  const m = new Map<string, { n: number; stage1: number }>();
  for (const r of rows) {
    const k = r.referral_source || "direct_link";
    const c = m.get(k) ?? { n: 0, stage1: 0 };
    c.n++; if (r.survey_post_completed) c.stage1++;
    m.set(k, c);
  }
  return [...m].map(([ref, c]) => ({ ref, ...c })).sort((a, b) => b.n - a.n);
}

const csvCols: (keyof R)[] = [
  "session_id", "created_at", "referral_source", "ab_plan_variant", "ab_framing_variant", "ab_cta_variant", "survey_pre_completed",
  "q1_household", "q2_fallback_nights", "q3_pain_1", "q3_pain_2", "q4_workaround", "q5_primary_store", "q5_weekly_spend",
  "task_1_plan", "task_2_mode", "task_3_deals", "task_4_list", "task_5_fridge", "accepted_week_clicked", "initial_mode_switched", "time_spent_seconds",
  "survey_post_completed", "q6_mode_winner", "q7_receipt_habit", "q8_pmf_score", "cta_converted", "contact_left",
  "bonus_completed", "q9_last_dinner_timing", "q10_switch_threshold", "q11_wasted_items", "q12_synergy_attitude", "q13_buy_a_feature",
  "q14_stated_wtp", "q15_open_feedback", "shared_on_whatsapp",
];
export function toCSV(rows: R[]) {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [csvCols.join(","), ...rows.map((r) => csvCols.map((c) => esc(r[c])).join(","))].join("\n");
}
