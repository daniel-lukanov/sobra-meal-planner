import { newSession, type ExperimentSession } from "@/lib/experiment-types";
import { fallbackOptions, featureKeys, householdOptions, modeOptions, painOptions, pmfOptions, receiptOptions, storeOptions, switchOptions, synergyOptions, timingOptions, wasteOptions, workaroundOptions, wtpOptions, type FeatureKey } from "./survey";

/** Small seeded random generator so the sample never changes between visits. */
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}
const refs = ["martin", "timon", "emma", "frederico", "direct_link", "whatsapp"];
const feedback = [
  "Needs real live prices or I won't trust it", "Would stop if Sunday prep takes longer than promised", "Missing vegetarian options",
  "Wish it synced with my flatmates", "Fine, but I'd forget to scan receipts", "Want Glovo integration for lazy nights",
  "Portions for 1 are still too big", "Exam weeks I won't cook at all", null,
];

let cache: ExperimentSession[] | null = null;
/** 32 sample Lisbon student sessions: all finished Stage 1, 24 finished the bonus. */
export function getMockExperimentData(): ExperimentSession[] {
  if (cache) return cache;
  const r = rng(46);
  const pick = <T,>(xs: readonly T[], w?: number[]) => {
    if (!w) return xs[Math.floor(r() * xs.length)]!;
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < xs.length; i++) { x -= w[i]!; if (x <= 0) return xs[i]!; }
    return xs.at(-1)!;
  };
  cache = Array.from({ length: 32 }, (_, i) => {
    const s = newSession(refs[i % refs.length]!, r);
    s.session_id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    s.created_at = new Date(Date.UTC(2026, 10, 3 + (i % 7), 9 + (i % 12), (i * 7) % 60)).toISOString();
    s.ab_cta_variant = (["C1_free_receipt_cashback", "C2_paid_199_student", "C3_paid_399_household"] as const)[i % 3]!;
    s.survey_pre_completed = true;
    s.q1_household = pick(householdOptions, [12, 5, 9, 2]);
    s.q2_fallback_nights = pick(fallbackOptions, [2, 4, 7, 8, 6, 5]);
    const p1 = pick(painOptions, [11, 6, 7, 5, 3]);
    s.q3_pain_1 = p1;
    s.q3_pain_2 = pick(painOptions.filter((p) => p !== p1));
    s.q4_workaround = pick(workaroundOptions, [9, 7, 6, 6, 4]);
    s.q5_primary_store = pick(storeOptions, [10, 9, 8, 3, 2]);
    s.q5_weekly_spend = 25 + Math.round(r() * 9) * 5;
    s.task_1_plan = r() < 0.85; s.task_2_mode = r() < 0.7; s.task_3_deals = r() < 0.6; s.task_4_list = r() < 0.55; s.task_5_fridge = r() < 0.5;
    s.initial_mode_switched = s.task_2_mode; s.accepted_week_clicked = s.task_1_plan && r() < 0.8; s.synergy_filter_used = s.task_1_plan;
    s.deals_tab_visited = s.task_3_deals || r() < 0.3; s.fridge_receipt_scanned = s.task_5_fridge; s.cook_tab_visited = r() < 0.4;
    s.time_spent_seconds = 90 + Math.round(r() * 240);
    s.survey_post_completed = true;
    s.q6_mode_winner = pick(modeOptions, [10, 7, 15]);
    s.q7_receipt_habit = pick(receiptOptions, [6, 12, 10, 4]);
    s.q8_pmf_score = pick(pmfOptions, [13, 14, 5]);
    // Fixed converters per offer (of ~11 each), so the sample always tells the same story.
    s.cta_converted = Math.floor(i / 3) < { C1_free_receipt_cashback: 8, C2_paid_199_student: 6, C3_paid_399_household: 3 }[s.ab_cta_variant];
    s.contact_left = s.cta_converted && r() < 0.75;
    s.contact = null; // sample data carries no contact details
    if (i < 24) {
      s.bonus_completed = true;
      s.q9_last_dinner_timing = pick(timingOptions, [12, 8, 3, 1]);
      s.q10_switch_threshold = pick(switchOptions, [6, 8, 5, 5]);
      s.q11_wasted_items = wasteOptions.slice(0, 5).filter((_, k) => r() < [0.6, 0.3, 0.45, 0.35, 0.25][k]!);
      if (!s.q11_wasted_items.length) s.q11_wasted_items = ["None"];
      s.q12_synergy_attitude = pick(synergyOptions, [9, 8, 4, 3]);
      const pts = Object.fromEntries(featureKeys.map((k) => [k, 0])) as Record<FeatureKey, number>;
      for (let k = 0; k < 5; k++) pts[pick(featureKeys, [5, 4, 2, 1.5, 2])] += 20;
      s.q13_buy_a_feature = pts;
      s.q14_stated_wtp = pick(wtpOptions, [9, 8, 4, 3]);
      s.q15_open_feedback = pick(feedback);
      s.shared_on_whatsapp = r() < 0.35;
    }
    return s;
  });
  return cache;
}
