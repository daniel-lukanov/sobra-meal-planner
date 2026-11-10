export const planVariants = ["A_weekly_prep", "B_daily_pick"] as const;
export const ctaVariants = ["1_receipt_cashback", "2_student_paid_pass"] as const;
export type PlanVariant = (typeof planVariants)[number];
export type CtaVariant = (typeof ctaVariants)[number];

export type ExperimentSession = {
  session_id: string;
  created_at: string;
  ab_plan_variant: PlanVariant;
  ab_cta_variant: CtaVariant;
  survey_pre_completed: boolean;
  household_size: string | null;
  fallback_nights: string | null;
  top_pain: string | null;
  current_workaround: string | null;
  preferred_store: string | null;
  weekly_spend: string | null;
  initial_mode_switched: boolean;
  accepted_week_clicked: boolean;
  synergy_filter_used: boolean;
  swapped_meal_clicked: boolean;
  deals_tab_visited: boolean;
  fridge_receipt_scanned: boolean;
  cook_tab_visited: boolean;
  time_spent_seconds: number;
  survey_post_completed: boolean;
  winning_feature: string | null;
  receipt_willingness: string | null;
  open_feedback: string | null;
  cta_converted: boolean | null;
  contact_left: boolean;
  contact: string | null;
};

export function newSession(): ExperimentSession {
  return {
    session_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ab_plan_variant: Math.random() < 0.5 ? "A_weekly_prep" : "B_daily_pick",
    ab_cta_variant: Math.random() < 0.5 ? "1_receipt_cashback" : "2_student_paid_pass",
    survey_pre_completed: false,
    household_size: null, fallback_nights: null, top_pain: null, current_workaround: null, preferred_store: null, weekly_spend: null,
    initial_mode_switched: false, accepted_week_clicked: false, synergy_filter_used: false, swapped_meal_clicked: false,
    deals_tab_visited: false, fridge_receipt_scanned: false, cook_tab_visited: false, time_spent_seconds: 0,
    survey_post_completed: false, winning_feature: null, receipt_willingness: null, open_feedback: null,
    cta_converted: null, contact_left: false, contact: null,
  };
}

export type TrackFlag = "initial_mode_switched" | "accepted_week_clicked" | "synergy_filter_used" | "swapped_meal_clicked" | "deals_tab_visited" | "fridge_receipt_scanned" | "cook_tab_visited";
