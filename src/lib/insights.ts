import { ctaVariants, planVariants, type ExperimentSession } from "./experiment-types";
import { isEmail } from "./experiment-types";

type R = ExperimentSession;
export const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 100));
const share = (rows: R[], f: (r: R) => boolean) => pct(rows.filter(f).length, rows.length);

export const acceptedFirstSession = (r: R, voluntaryOnly = false) => r.events.some((e) => e.e === "accepted_week_clicked" && e.first_session && (!voluntaryOnly || !e.in_tour));
export const isReferred = (r: R) => !!r.ref && r.utm_source === "whatsapp_share";
export const isReferralSignup = (r: R) => isReferred(r) && r.events.some((e) => e.e === "referral_signup");
export const shared = (r: R) => r.whatsapp_share_clicked + r.plan_copied > 0;
export const leftContact = (r: R) => !!r.cta_contact || isEmail(r.raffle_email);

export const funnelSteps = [
  ["Visits", () => true],
  ["Block 1 done (acquired)", (r) => r.survey_pre_completed],
  ["Accepted plan, first session", (r) => acceptedFirstSession(r)],
  ["Block 3 done", (r) => r.survey_post_completed],
  ["CTA clicked", (r) => r.cta_clicked],
  ["Shared", shared],
  ["Referral sign-ups", isReferralSignup],
] as const satisfies readonly (readonly [string, (r: R) => boolean])[];

export function funnel(rows: R[]) {
  return funnelSteps.map(([label, f]) => ({ label, count: rows.filter(f).length, pct: pct(rows.filter(f).length, rows.length) }));
}
export function groupBy(rows: R[], key: (r: R) => string) {
  const m = new Map<string, R[]>();
  for (const r of rows) { const k = key(r); m.set(k, [...(m.get(k) ?? []), r]); }
  return [...m].sort((a, b) => b[1].length - a[1].length);
}

/** ISO week label like 2026-W46. */
export function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
/** North star proxy: plans accepted per week, counted by the week of the first accept. */
export function plansPerWeek(rows: R[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const e = r.events.find((x) => x.e === "accepted_week_clicked");
    if (e) { const k = isoWeek(new Date(e.at)); m.set(k, (m.get(k) ?? 0) + 1); }
  }
  return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => ({ week, count }));
}

export type Spend = { channel: string; amount: number };
export function costPerTester(rows: R[], spend: Spend[]) {
  const total = spend.reduce((a, s) => a + s.amount, 0);
  const acquired = rows.filter((r) => r.survey_pre_completed).length;
  const channels = [...new Set([...spend.map((s) => s.channel), ...rows.map((r) => r.utm_source)])];
  return {
    total, acquired, cpa: acquired ? Math.round((total / acquired) * 100) / 100 : null,
    byChannel: channels.map((c) => {
      const sp = spend.filter((s) => s.channel === c).reduce((a, s) => a + s.amount, 0);
      const n = rows.filter((r) => r.utm_source === c && r.survey_pre_completed).length;
      return { channel: c, spend: sp, acquired: n, cpa: n ? Math.round((sp / n) * 100) / 100 : null };
    }).sort((a, b) => b.spend - a.spend || b.acquired - a.acquired),
  };
}

/** Activation: first-session visitors who tapped Accept this week on their own, out of all first-session visitors. */
export function activation(rows: R[]) {
  const n = rows.length;
  return { n, voluntary: pct(rows.filter((r) => acceptedFirstSession(r, true)).length, n), withTour: pct(rows.filter((r) => acceptedFirstSession(r)).length, n) };
}

export function planTable(rows: R[]) {
  return planVariants.map((v) => { const g = rows.filter((r) => r.ab_plan_variant === v); return { variant: v, n: g.length, accept: share(g, (r) => r.accepted_week_clicked), rows: g }; });
}
export function ctaTable(rows: R[]) {
  return ctaVariants.map((v) => {
    const g = rows.filter((r) => r.ab_cta_variant === v && r.survey_post_completed);
    return { variant: v, n: g.length, click: share(g, (r) => r.cta_clicked), contact: share(g, leftContact) };
  });
}

/** Counts answers for one question; percentages are of people who answered it. */
export function distribution(rows: R[], key: keyof R, options?: readonly string[]) {
  const counts = new Map<string, number>();
  options?.forEach((o) => counts.set(o, 0));
  let answered = 0;
  for (const r of rows) {
    const v = r[key];
    const vals = Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? [v] : [];
    if (!vals.length) continue;
    answered++;
    for (const x of vals) counts.set(x, (counts.get(x) ?? 0) + 1);
  }
  const out = [...counts].map(([label, count]) => ({ label, count, pct: pct(count, answered) }));
  return { answered, items: options ? out : out.sort((a, b) => b.count - a.count) };
}

export function behaviour(rows: R[]) {
  const n = rows.length || 1;
  const sum = (f: (r: R) => number) => rows.reduce((a, r) => a + f(r), 0);
  const round = (x: number) => Math.round(x * 10) / 10;
  return {
    voluntaryScans: rows.filter((r) => r.events.some((e) => e.e === "receipt_scan_tried" && !e.in_tour)).length,
    guidedScans: rows.filter((r) => r.events.some((e) => e.e === "receipt_scan_tried" && e.in_tour)).length,
    dealsAdded: sum((r) => r.deal_added_to_plan),
    swapsPerSession: round(sum((r) => r.swap_count) / n),
    tiktok: sum((r) => r.fake_door_tiktok_clicks), delivery: sum((r) => r.fake_door_delivery_clicks),
    shares: sum((r) => r.whatsapp_share_clicked), copies: sum((r) => r.plan_copied),
    igFollows: rows.filter((r) => r.ig_follow_clicked).length,
    tourSkipped: rows.filter((r) => r.tour_skipped).length,
  };
}

/** Extra raffle entries: referral sign-ups per sharer code. */
export function referralEntries(rows: R[]) {
  const m = new Map<string, number>();
  for (const r of rows) if (isReferralSignup(r)) m.set(r.ref!, (m.get(r.ref!) ?? 0) + 1);
  return [...m].map(([ref, entries]) => ({ ref, entries, sharer: rows.find((r) => r.my_ref === ref) })).sort((a, b) => b.entries - a.entries);
}

const csvCols: (keyof R)[] = [
  "session_id", "created_at", "my_ref", "ref", "utm_source", "utm_content", "shared_plan_id", "visits", "first_session", "ab_plan_variant", "ab_cta_variant", "store",
  "survey_pre_completed", "b1_fallback_dinners", "b1_pains", "b1_pains_order", "b1_workarounds",
  "opened_weekly", "opened_daily", "b2_mode_pref", "b2_mode_reason", "b2_prep_blockers",
  "survey_post_completed", "b3_receipt", "b3_receipt_blockers", "b3_keep_one", "b3_deal_brand", "b3_pmf", "b3_stoppers", "b3_stoppers_other",
  "cta_clicked", "cta_contact", "raffle_email", "ig_follow_clicked",
  "accepted_week_clicked", "mode_switched", "receipt_scan_tried", "deal_added_to_plan", "swap_count", "fake_door_tiktok_clicks", "fake_door_delivery_clicks",
  "whatsapp_share_clicked", "plan_copied", "tour_skipped", "tour_completed", "time_spent_seconds", "events",
];
export function toCSV(rows: R[]) {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) && v.every((x) => typeof x === "string") ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [csvCols.join(","), ...rows.map((r) => csvCols.map((c) => esc(r[c])).join(","))].join("\n");
}

/** An accidental open: no Block 1 and no tracked action. */
export const isBounce = (r: R) => !r.survey_pre_completed && r.events.filter((e) => e.e !== "referral_visit").length === 0;
export type SessionStatus = "Block 3 done" | "Block 1 done" | "Bounce" | "Started";
export function statusOf(r: R): SessionStatus {
  if (r.survey_post_completed) return "Block 3 done";
  if (r.survey_pre_completed) return "Block 1 done";
  if (isBounce(r)) return "Bounce";
  return "Started";
}
