import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ctaVariants, planVariants, type ExperimentSession } from "./experiment-types";

const b = z.boolean();
const t = z.string().max(300).nullable();
const sessionSchema = z.object({
  session_id: z.string().uuid(),
  created_at: z.string().max(40),
  ab_plan_variant: z.enum(planVariants),
  ab_cta_variant: z.enum(ctaVariants),
  survey_pre_completed: b,
  household_size: t, fallback_nights: t, top_pain: t, current_workaround: t, preferred_store: t, weekly_spend: t,
  initial_mode_switched: b, accepted_week_clicked: b, synergy_filter_used: b, swapped_meal_clicked: b,
  deals_tab_visited: b, fridge_receipt_scanned: b, cook_tab_visited: b,
  time_spent_seconds: z.number().int().min(0).max(86400),
  survey_post_completed: b,
  winning_feature: t, receipt_willingness: t,
  open_feedback: z.string().max(2000).nullable(),
  cta_converted: z.boolean().nullable(),
  contact_left: b,
  contact: z.string().max(200).nullable(),
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
    const { data: rows, error } = await supabaseAdmin.from("experiment_sessions").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: (rows ?? []) as unknown as ExperimentSession[] };
  });
