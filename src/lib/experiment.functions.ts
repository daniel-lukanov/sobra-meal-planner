import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ctaVariants, framingVariants, planVariants, type ExperimentSession } from "./experiment-types";
import { featureKeys } from "@/data/survey";

const b = z.boolean();
const t = z.string().max(300).nullable();
const sessionSchema = z.object({
  session_id: z.string().uuid(),
  created_at: z.string().max(40),
  referral_source: z.string().max(60),
  ab_plan_variant: z.enum(planVariants),
  ab_framing_variant: z.enum(framingVariants),
  ab_cta_variant: z.enum(ctaVariants),
  survey_pre_completed: b,
  q1_household: t, q2_fallback_nights: t, q3_pain_1: t, q3_pain_2: t, q4_workaround: t, q5_primary_store: t,
  q5_weekly_spend: z.number().int().min(0).max(1000).nullable(),
  task_1_plan: b, task_2_mode: b, task_3_deals: b, task_4_list: b, task_5_fridge: b,
  initial_mode_switched: b, accepted_week_clicked: b, synergy_filter_used: b, swapped_meal_clicked: b,
  deals_tab_visited: b, fridge_receipt_scanned: b, cook_tab_visited: b,
  time_spent_seconds: z.number().int().min(0).max(86400),
  survey_post_completed: b,
  q6_mode_winner: t, q7_receipt_habit: t, q8_pmf_score: t,
  cta_converted: z.boolean().nullable(),
  contact_left: b,
  contact: z.string().max(200).nullable(),
  bonus_completed: b,
  q9_last_dinner_timing: t, q10_switch_threshold: t,
  q11_wasted_items: z.array(z.string().max(100)).max(10).nullable(),
  q12_synergy_attitude: t,
  q13_buy_a_feature: z.record(z.enum(featureKeys), z.number().int().min(0).max(100)).nullable(),
  q14_stated_wtp: t,
  q15_open_feedback: z.string().max(2000).nullable(),
  shared_on_whatsapp: b,
});

/** Public on purpose: anonymous testers save their own session, keyed by an unguessable id. */
export const saveExperimentSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => sessionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("experiment_sessions").upsert({ ...data, updated_at: new Date().toISOString() });
    if (error) { console.error("saveExperimentSession", error.message); return { ok: false as const }; }
    return { ok: true as const };
  });

async function passcodeMatches(input: string, expected: string) {
  const enc = new TextEncoder();
  const [a, c] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(input)), crypto.subtle.digest("SHA-256", enc.encode(expected))]);
  const x = new Uint8Array(a), y = new Uint8Array(c);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

export const getInsights = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ passcode: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["INSIGHTS_PASSCODE"];
    if (!expected) throw new Error("INSIGHTS_PASSCODE is not set");
    if (!(await passcodeMatches(data.passcode, expected))) return { ok: false as const, rows: [] as ExperimentSession[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only rows from the 3-way funnel; older test rows used other variant names.
    const { data: rows, error } = await supabaseAdmin.from("experiment_sessions").select("*").in("ab_cta_variant", [...ctaVariants])
      .order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: (rows ?? []) as unknown as ExperimentSession[] };
  });
