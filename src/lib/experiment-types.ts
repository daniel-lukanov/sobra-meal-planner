import type { FeatureKey } from "@/data/survey";

export const planVariants = ["A_weekly_prep", "B_daily_pick"] as const;
export const framingVariants = ["F1_money_saver", "F2_time_mental_load"] as const;
export const ctaVariants = ["C1_free_receipt_cashback", "C2_paid_199_student", "C3_paid_399_household"] as const;
export type PlanVariant = (typeof planVariants)[number];
export type FramingVariant = (typeof framingVariants)[number];
export type CtaVariant = (typeof ctaVariants)[number];

export const taskKeys = ["task_1_plan", "task_2_mode", "task_3_deals", "task_4_list", "task_5_fridge"] as const;
export type TaskKey = (typeof taskKeys)[number];

export type ExperimentSession = {
  session_id: string;
  created_at: string;
  referral_source: string;
  ab_plan_variant: PlanVariant;
  ab_framing_variant: FramingVariant;
  ab_cta_variant: CtaVariant;
  survey_pre_completed: boolean;
  q1_household: string | null;
  q2_fallback_nights: string | null;
  q3_pain_1: string | null;
  q3_pain_2: string | null;
  q4_workaround: string | null;
  q5_primary_store: string | null;
  q5_weekly_spend: number | null;
  task_1_plan: boolean;
  task_2_mode: boolean;
  task_3_deals: boolean;
  task_4_list: boolean;
  task_5_fridge: boolean;
  initial_mode_switched: boolean;
  accepted_week_clicked: boolean;
  synergy_filter_used: boolean;
  swapped_meal_clicked: boolean;
  deals_tab_visited: boolean;
  fridge_receipt_scanned: boolean;
  cook_tab_visited: boolean;
  time_spent_seconds: number;
  survey_post_completed: boolean;
  q6_mode_winner: string | null;
  q7_receipt_habit: string | null;
  q8_pmf_score: string | null;
  cta_converted: boolean | null;
  contact_left: boolean;
  contact: string | null;
  bonus_completed: boolean;
  q9_last_dinner_timing: string | null;
  q10_switch_threshold: string | null;
  q11_wasted_items: string[] | null;
  q12_synergy_attitude: string | null;
  q13_buy_a_feature: Record<FeatureKey, number> | null;
  q14_stated_wtp: string | null;
  q15_open_feedback: string | null;
  shared_on_whatsapp: boolean;
};

const pick = <T,>(xs: readonly T[], r: number) => xs[Math.min(xs.length - 1, Math.floor(r * xs.length))]!;

/** Reads ?ref= or ?utm_source= so teammates can track who brought each tester. */
export function referralFrom(search: string) {
  const p = new URLSearchParams(search);
  const v = (p.get("ref") ?? p.get("utm_source") ?? "").trim().toLowerCase().slice(0, 60);
  return v || "direct_link";
}

export function newSession(referral = "direct_link", rand: () => number = Math.random): ExperimentSession {
  return {
    session_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    referral_source: referral,
    ab_plan_variant: pick(planVariants, rand()),
    ab_framing_variant: pick(framingVariants, rand()),
    ab_cta_variant: pick(ctaVariants, rand()),
    survey_pre_completed: false,
    q1_household: null, q2_fallback_nights: null, q3_pain_1: null, q3_pain_2: null, q4_workaround: null, q5_primary_store: null, q5_weekly_spend: null,
    task_1_plan: false, task_2_mode: false, task_3_deals: false, task_4_list: false, task_5_fridge: false,
    initial_mode_switched: false, accepted_week_clicked: false, synergy_filter_used: false, swapped_meal_clicked: false,
    deals_tab_visited: false, fridge_receipt_scanned: false, cook_tab_visited: false, time_spent_seconds: 0,
    survey_post_completed: false, q6_mode_winner: null, q7_receipt_habit: null, q8_pmf_score: null,
    cta_converted: null, contact_left: false, contact: null,
    bonus_completed: false, q9_last_dinner_timing: null, q10_switch_threshold: null, q11_wasted_items: null, q12_synergy_attitude: null,
    q13_buy_a_feature: null, q14_stated_wtp: null, q15_open_feedback: null, shared_on_whatsapp: false,
  };
}

export type TrackFlag = TaskKey | "initial_mode_switched" | "accepted_week_clicked" | "synergy_filter_used" | "swapped_meal_clicked" | "deals_tab_visited" | "fridge_receipt_scanned" | "cook_tab_visited";
export const tasksDone = (s: ExperimentSession) => taskKeys.filter((k) => s[k]).length;
