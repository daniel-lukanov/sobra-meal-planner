import { isEmail, surveyVersionOf, type ExperimentSession } from "./experiment-types";
import { distribution, groupBy, isoWeek, pct } from "./insights";
import { STRINGS } from "./i18n";
import { optKey, QUESTIONS, type QId } from "./savings/survey";

type R = ExperimentSession;
/** Only sessions from the savings check go into the charts. Older meal-planner sessions stay in the CSV and the Session Explorer. */
export const onlyV3 = (rows: R[]) => rows.filter((r) => surveyVersionOf(r) === "v3_savings");

const has = (r: R, e: string) => r.events.some((x) => x.e === e);
const count = (r: R, e: string) => r.events.filter((x) => x.e === e).length;
export const sawResult = (r: R) => has(r, "result_shown");
export const sharedResult = (r: R) => r.whatsapp_share_clicked > 0 || has(r, "result_copied");
export const leftContact3 = (r: R) => !!r.cta_contact || isEmail(r.raffle_email) || isEmail(r.referral_email);
export const isReferralSignup3 = (r: R) => !!r.ref && r.utm_source === "whatsapp_share" && has(r, "referral_signup");

export function funnel3(rows: R[]) {
  const steps: [string, (r: R) => boolean][] = [
    ["Visits", () => true], ["Block 1 completed", (r) => r.survey_pre_completed], ["Result shown", sawResult], ["Block 3 completed", (r) => r.survey_post_completed],
    ["CTA clicked", (r) => r.cta_clicked], ["Contact left", leftContact3], ["Shared", sharedResult], ["Referral sign-ups", isReferralSignup3],
  ];
  return steps.map(([label, f]) => { const n = rows.filter(f).length; return { label, count: n, pct: pct(n, rows.length) }; });
}

/** North star: savings checks shared per week, each result counted once, by the week of its first share. Ghost Mode visits are never recorded. */
export function sharedPerWeek(rows: R[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const e = r.events.find((x) => x.e === "whatsapp_share_clicked" || x.e === "result_copied");
    if (e) { const k = isoWeek(new Date(e.at)); m.set(k, (m.get(k) ?? 0) + 1); }
  }
  return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => ({ week, count }));
}

export function referralStats(rows: R[]) {
  const signups = rows.filter(isReferralSignup3).length;
  return { signups, perShared: rows.filter(sharedResult).length ? Math.round((signups / rows.filter(sharedResult).length) * 100) / 100 : 0, rate: pct(signups, rows.filter(sawResult).length) };
}

/** Activation: first-session visitors who reached the savings screen. */
export const activation3 = (rows: R[]) => pct(rows.filter((r) => r.events.some((e) => e.e === "result_shown" && e.first_session)).length, rows.length);

/** Return: a second receipt check on a later visit, within 14 days of the first. */
export function returnRate(rows: R[]) {
  const back = rows.filter((r) => {
    const p = r.events.filter((e) => e.e === "path_chosen");
    if (p.length < 2) return false;
    const first = new Date(p[0]!.at).getTime();
    return p.slice(1).some((e) => !e.first_session && new Date(e.at).getTime() - first <= 14 * 86400000);
  }).length;
  return { back, pct: pct(back, rows.filter(sawResult).length) };
}

const ctaGroup = (r: R) => (r.ab_cta_variant === "free_pilot" ? "free_pilot" : "paid");
export function ctaTable3(rows: R[]) {
  return (["free_pilot", "paid"] as const).map((v) => {
    const g = rows.filter((r) => ctaGroup(r) === v && sawResult(r));
    return { variant: v, n: g.length, click: pct(g.filter((r) => r.cta_clicked).length, g.length), contact: pct(g.filter(leftContact3).length, g.length) };
  });
}

export function behaviour3(rows: R[]) {
  const ev = (e: string) => rows.reduce((a, r) => a + count(r, e), 0);
  const shown = rows.filter((r) => typeof r.result_saving === "number");
  const photos = rows.filter((r) => has(r, "receipt_photo_taken")).length;
  return {
    receipt: rows.filter((r) => r.path === "receipt").length, manual: rows.filter((r) => r.path === "manual").length, demo: rows.filter((r) => r.path === "demo").length,
    parseFailRate: pct(rows.filter((r) => has(r, "receipt_parse_failed")).length, photos),
    avgSaving: shown.length ? Math.round((shown.reduce((a, r) => a + (r.result_saving ?? 0), 0) / shown.length) * 100) / 100 : null,
    doorLoyalty: ev("fake_door_loyalty"), doorDinners: ev("fake_door_dinners"), doorDelivery: ev("fake_door_delivery"),
    shares: rows.reduce((a, r) => a + r.whatsapp_share_clicked, 0), copies: ev("result_copied"), igFollows: rows.filter((r) => r.ig_follow_clicked).length,
    promptShown: rows.filter((r) => has(r, "survey_prompt_shown")).length, promptAccepted: rows.filter((r) => has(r, "survey_prompt_accepted")).length,
    listClicks: ev("list_cta_clicked"), secondListBlocked: ev("second_list_blocked"),
  };
}

/** Answers for one question with English labels. Q5b counts only people who picked "Nothing" in Q5. */
export function questionChart(rows: R[], id: QId) {
  const q = QUESTIONS[id];
  const base = id === "q5b" ? rows.filter((r) => r.b3_actions?.includes("nothing")) : rows;
  const d = distribution(base, q.field as keyof R, q.options.map((o) => o.value));
  return { answered: d.answered, items: d.items.map((i) => ({ ...i, label: STRINGS.en[optKey(id, i.label)] ?? i.label })) };
}

/** Q8 "very disappointed" share, split by utm_source and by household size (Q1). */
export function pmfSplit(rows: R[], by: "utm_source" | "b1_household") {
  return groupBy(rows.filter((r) => r.b3_pmf), (r) => (by === "utm_source" ? r.utm_source : (r[by] as string | null | undefined) ?? "unknown"))
    .map(([k, g]) => [by === "b1_household" ? (STRINGS.en[optKey("q1", k)] ?? k) : k, `${g.length}`, `${pct(g.filter((r) => r.b3_pmf === "very").length, g.length)}%`]);
}

export const WHY: [string, string, string][] = [
  ["Q1 household", "families save more and care more", "if 3+ households show higher savings and more CTA clicks, families become the main segment"],
  ["Q2 weekly spend", "the savings are big enough to matter", "sizes the €/month we can promise per segment"],
  ["Q3 deal habits", "people already patch the problem", "\"check flyer/app\" = early adopters; \"loyalty card\" = competitor we must beat or integrate"],
  ["Q4 number trust", "people believe the estimate", "over 30% \"too high\" = show the calculation more clearly before anything else"],
  ["Q5 actions + Q5b", "people change behaviour to save", "most picked action = recommendation type we build first; over 50% \"Nothing\" = value proposition broken, blockers say why"],
  ["Q6 input", "people will give us their shopping", "under 30% receipt = make \"pick products once\" the main input"],
  ["Q7 frequency", "weekly habit possible", "under 40% weekly = subscription is weak, think pay-per-list"],
  ["Q8 pmf", "product/market fit", "40% very disappointed = strong signal (split by utm_source and ref)"],
  ["Q9 stoppers", "what blocks use", "top answer becomes the next iteration"],
];
