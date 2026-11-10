CREATE TABLE public.experiment_sessions (
  session_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ab_plan_variant text NOT NULL,
  ab_cta_variant text NOT NULL,
  survey_pre_completed boolean NOT NULL DEFAULT false,
  household_size text,
  fallback_nights text,
  top_pain text,
  current_workaround text,
  preferred_store text,
  weekly_spend text,
  initial_mode_switched boolean NOT NULL DEFAULT false,
  accepted_week_clicked boolean NOT NULL DEFAULT false,
  synergy_filter_used boolean NOT NULL DEFAULT false,
  swapped_meal_clicked boolean NOT NULL DEFAULT false,
  deals_tab_visited boolean NOT NULL DEFAULT false,
  fridge_receipt_scanned boolean NOT NULL DEFAULT false,
  cook_tab_visited boolean NOT NULL DEFAULT false,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  survey_post_completed boolean NOT NULL DEFAULT false,
  winning_feature text,
  receipt_willingness text,
  open_feedback text,
  cta_converted boolean,
  contact_left boolean NOT NULL DEFAULT false,
  contact text
);
GRANT ALL ON public.experiment_sessions TO service_role;
ALTER TABLE public.experiment_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: the app reads and writes only through server functions.