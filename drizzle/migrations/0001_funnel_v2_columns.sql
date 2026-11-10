ALTER TABLE public.experiment_sessions
  ADD COLUMN referral_source text NOT NULL DEFAULT 'direct_link',
  ADD COLUMN ab_framing_variant text,
  ADD COLUMN task_1_plan boolean NOT NULL DEFAULT false,
  ADD COLUMN task_2_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN task_3_deals boolean NOT NULL DEFAULT false,
  ADD COLUMN task_4_list boolean NOT NULL DEFAULT false,
  ADD COLUMN task_5_fridge boolean NOT NULL DEFAULT false,
  ADD COLUMN q1_household text,
  ADD COLUMN q2_fallback_nights text,
  ADD COLUMN q3_pain_1 text,
  ADD COLUMN q3_pain_2 text,
  ADD COLUMN q4_workaround text,
  ADD COLUMN q5_primary_store text,
  ADD COLUMN q5_weekly_spend integer,
  ADD COLUMN q6_mode_winner text,
  ADD COLUMN q7_receipt_habit text,
  ADD COLUMN q8_pmf_score text,
  ADD COLUMN bonus_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN q9_last_dinner_timing text,
  ADD COLUMN q10_switch_threshold text,
  ADD COLUMN q11_wasted_items text[],
  ADD COLUMN q12_synergy_attitude text,
  ADD COLUMN q13_buy_a_feature jsonb,
  ADD COLUMN q14_stated_wtp text,
  ADD COLUMN q15_open_feedback text,
  ADD COLUMN shared_on_whatsapp boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.experiment_sessions.household_size IS 'DEPRECATED: replaced by q1_household';
COMMENT ON COLUMN public.experiment_sessions.top_pain IS 'DEPRECATED: replaced by q3_pain_1';
COMMENT ON COLUMN public.experiment_sessions.winning_feature IS 'DEPRECATED: replaced by q13_buy_a_feature';
COMMENT ON COLUMN public.experiment_sessions.receipt_willingness IS 'DEPRECATED: replaced by q7_receipt_habit';
COMMENT ON COLUMN public.experiment_sessions.open_feedback IS 'DEPRECATED: replaced by q15_open_feedback';