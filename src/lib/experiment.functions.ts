import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ctaVariants, eventNames, planVariants, type ExperimentSession } from "./experiment-types";

const b = z.boolean();
const t = z.string().max(300).nullable();
const arr = z.array(z.string().max(200)).max(12);
const n = z.number().int().min(0).max(100000);
export const sessionSchema = z.object({
  session_id: z.string().uuid(), created_at: z.string().max(40), my_ref: z.string().max(20), ref: z.string().max(60).nullable(),
  utm_source: z.string().max(60), utm_content: z.string().max(60).nullable(), shared_plan_id: z.string().uuid().nullable(), visits: n,
  ab_plan_variant: z.enum(planVariants), ab_cta_variant: z.enum(ctaVariants), store: t,
  survey_pre_completed: b, b1_fallback_dinners: t, b1_pains: arr, b1_pains_order: arr, b1_workarounds: arr,
  opened_weekly: b, opened_daily: b, b2_mode_pref: t, b2_mode_reason: t, b2_prep_blockers: arr,
  survey_post_completed: b, b3_receipt: t, b3_receipt_blockers: arr, b3_keep_one: t, b3_deal_brand: t, b3_pmf: t, b3_stoppers: arr, b3_stoppers_other: t,
  cta_clicked: b, cta_contact: z.string().max(200).nullable(), raffle_email: z.string().max(200).nullable(), ig_follow_clicked: b,
  accepted_week_clicked: b, mode_switched: b, receipt_scan_tried: b, deal_added_to_plan: n, swap_count: n,
  fake_door_tiktok_clicks: n, fake_door_delivery_clicks: n, whatsapp_share_clicked: n, plan_copied: n,
  tour_skipped: b, tour_completed: b, time_spent_seconds: z.number().int().min(0).max(864000), first_session: b,
  events: z.array(z.object({ e: z.enum(eventNames), at: z.string().max(40), in_tour: b, first_session: b })).max(400),
});

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const row = (s: ExperimentSession) => ({ session_id: s.session_id, created_at: s.created_at, updated_at: new Date().toISOString(), data: s as unknown as never });

/** Public on purpose: anonymous testers save their own session, keyed by an unguessable id. */
export const saveExperimentSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => sessionSchema.parse(d))
  .handler(async ({ data }) => {
    const { error } = await (await admin()).from("study_sessions").upsert(row(data as ExperimentSession));
    if (error) { console.error("saveExperimentSession", error.message); return { ok: false as const }; }
    return { ok: true as const };
  });

/** The team passcode is case-insensitive. */
export const normalizePasscode = (s: string) => s.trim().toLowerCase();

async function passcodeMatches(rawInput: string, rawExpected: string) {
  const enc = new TextEncoder();
  const [a, c] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(normalizePasscode(rawInput))), crypto.subtle.digest("SHA-256", enc.encode(normalizePasscode(rawExpected)))]);
  const x = new Uint8Array(a), y = new Uint8Array(c);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}
async function requirePasscode(passcode: string) {
  const expected = process.env["INSIGHTS_PASSCODE"];
  if (!expected) throw new Error("INSIGHTS_PASSCODE is not set");
  if (!(await passcodeMatches(passcode, expected))) throw new Error("Wrong passcode");
}

export type SpendRow = { id: string; spent_on: string; channel: string; amount: number };

export const getInsights = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ passcode: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    try { await requirePasscode(data.passcode); } catch { return { ok: false as const, rows: [] as ExperimentSession[], spend: [] as SpendRow[] }; }
    const db = await admin();
    const [{ data: rows, error }, { data: spend, error: e2 }] = await Promise.all([
      db.from("study_sessions").select("data").order("created_at", { ascending: false }).limit(2000),
      db.from("spend_log").select("id, spent_on, channel, amount").order("spent_on", { ascending: false }),
    ]);
    if (error || e2) throw new Error((error ?? e2)!.message);
    return {
      ok: true as const,
      rows: (rows ?? []).map((r) => r.data as unknown as ExperimentSession),
      spend: (spend ?? []).map((s) => ({ ...s, amount: Number(s.amount) })) as SpendRow[],
    };
  });

/** Founder-only edit or manual entry of one session. Guarded by the passcode instead of open RLS policies. */
export const adminSaveSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ passcode: z.string().max(200), session: sessionSchema }).parse(d))
  .handler(async ({ data }) => {
    await requirePasscode(data.passcode);
    const { error } = await (await admin()).from("study_sessions").upsert(row(data.session as ExperimentSession));
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteSessions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ passcode: z.string().max(200), ids: z.array(z.string().uuid()).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    await requirePasscode(data.passcode);
    if (!data.ids.length) return { ok: true as const, deleted: 0 };
    const { error, count } = await (await admin()).from("study_sessions").delete({ count: "exact" }).in("session_id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true as const, deleted: count ?? 0 };
  });

export const addSpend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ passcode: z.string().max(200), spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), channel: z.string().trim().min(1).max(60), amount: z.number().min(0).max(100000) }).parse(d))
  .handler(async ({ data }) => {
    await requirePasscode(data.passcode);
    const { data: r, error } = await (await admin()).from("spend_log").insert({ spent_on: data.spent_on, channel: data.channel.toLowerCase(), amount: data.amount }).select("id, spent_on, channel, amount").single();
    if (error) throw new Error(error.message);
    return { ...r, amount: Number(r.amount) } as SpendRow;
  });

export const deleteSpend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ passcode: z.string().max(200), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requirePasscode(data.passcode);
    const { error } = await (await admin()).from("spend_log").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const planSnapshot = z.object({
  chosen: z.record(z.string().max(4), z.string().max(80)),
  dinners: z.array(z.object({ day: z.string().max(10), title: z.string().max(80) })).max(10),
  items: z.array(z.string().max(80)).max(30),
});
export type PlanSnapshot = z.infer<typeof planSnapshot>;

/** Public: any tester can share their plan. Snapshots hold no personal data. */
export const createSharedPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    sharer_session_id: z.string().uuid().nullable(), store: z.string().max(40), mode: z.enum(["prep", "daily"]),
    people: z.number().int().min(1).max(6), total: z.number().min(0).max(1000), plan: planSnapshot,
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: r, error } = await (await admin()).from("shared_plans").insert({
      sharer_session_id: data.sharer_session_id, store: data.store, mode: data.mode, people: data.people, total: data.total, plan_json: data.plan,
    }).select("id").single();
    if (error) { console.error("createSharedPlan", error.message); return { ok: false as const }; }
    return { ok: true as const, id: r.id };
  });

/** Public: shared links are unguessable ids and only reveal the plan itself. */
export const getSharedPlan = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: r } = await (await admin()).from("shared_plans").select("id, store, mode, people, total, plan_json").eq("id", data.id).maybeSingle();
    if (!r) return null;
    return { id: r.id, store: r.store, mode: r.mode as "prep" | "daily", people: r.people, total: Number(r.total), plan: r.plan_json as unknown as PlanSnapshot };
  });
