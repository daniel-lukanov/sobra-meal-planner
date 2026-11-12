export const planVariants = ["A_weekly_prep", "B_daily_pick"] as const;
export const ctaVariants = ["free_pilot", "paid_199"] as const;
export type PlanVariant = (typeof planVariants)[number];
export type CtaVariant = (typeof ctaVariants)[number];

export const eventNames = [
  "accepted_week_clicked", "mode_switched", "deal_added_to_plan", "receipt_scan_tried", "swap", "fake_door_tiktok", "fake_door_delivery",
  "whatsapp_share_clicked", "plan_copied", "ig_follow_clicked", "cta_clicked", "tour_skipped", "tour_completed",
  "referral_visit", "referral_activated", "referral_signup",
] as const;
export type EventName = (typeof eventNames)[number];
export type StudyEvent = { e: EventName; at: string; in_tour: boolean; first_session: boolean };

export type ExperimentSession = {
  session_id: string;
  created_at: string;
  /** This visitor's own code, put on links they share. */
  my_ref: string;
  /** Referral code from the link they arrived on. */
  ref: string | null;
  utm_source: string;
  utm_content: string | null;
  shared_plan_id: string | null;
  visits: number;
  ab_plan_variant: PlanVariant;
  ab_cta_variant: CtaVariant;
  store: string | null;
  // Block 1
  survey_pre_completed: boolean;
  b1_fallback_dinners: string | null;
  b1_pains: string[];
  b1_pains_order: string[];
  b1_workarounds: string[];
  // Block 2
  opened_weekly: boolean;
  opened_daily: boolean;
  b2_mode_pref: string | null;
  b2_mode_reason: string | null;
  b2_prep_blockers: string[];
  // Block 3
  survey_post_completed: boolean;
  b3_receipt: string | null;
  b3_receipt_blockers: string[];
  b3_keep_one: string | null;
  b3_deal_brand: string | null;
  b3_pmf: string | null;
  b3_stoppers: string[];
  b3_stoppers_other: string | null;
  cta_clicked: boolean;
  cta_contact: string | null;
  raffle_email: string | null;
  ig_follow_clicked: boolean;
  // Behaviour
  accepted_week_clicked: boolean;
  mode_switched: boolean;
  receipt_scan_tried: boolean;
  deal_added_to_plan: number;
  swap_count: number;
  fake_door_tiktok_clicks: number;
  fake_door_delivery_clicks: number;
  whatsapp_share_clicked: number;
  plan_copied: number;
  tour_skipped: boolean;
  tour_completed: boolean;
  time_spent_seconds: number;
  first_session: boolean;
  events: StudyEvent[];
};

const pick = <T,>(xs: readonly T[], r: number) => xs[Math.min(xs.length - 1, Math.floor(r * xs.length))]!;
const clean = (v: string | null) => (v ?? "").trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, "").slice(0, 60);

/** Reads ref, utm_source and utm_content from the first URL a visitor opens. */
export function attributionFrom(search: string) {
  const p = new URLSearchParams(search);
  return { ref: clean(p.get("ref")) || null, utm_source: clean(p.get("utm_source")) || "direct", utm_content: clean(p.get("utm_content")) || null };
}

export function newSession(search = "", rand: () => number = Math.random): ExperimentSession {
  const id = crypto.randomUUID();
  return {
    session_id: id, created_at: new Date().toISOString(), my_ref: id.slice(0, 8), ...attributionFrom(search), shared_plan_id: null, visits: 1,
    ab_plan_variant: pick(planVariants, rand()), ab_cta_variant: pick(ctaVariants, rand()), store: null,
    survey_pre_completed: false, b1_fallback_dinners: null, b1_pains: [], b1_pains_order: [], b1_workarounds: [],
    opened_weekly: false, opened_daily: false, b2_mode_pref: null, b2_mode_reason: null, b2_prep_blockers: [],
    survey_post_completed: false, b3_receipt: null, b3_receipt_blockers: [], b3_keep_one: null, b3_deal_brand: null, b3_pmf: null, b3_stoppers: [], b3_stoppers_other: null,
    cta_clicked: false, cta_contact: null, raffle_email: null, ig_follow_clicked: false,
    accepted_week_clicked: false, mode_switched: false, receipt_scan_tried: false, deal_added_to_plan: 0, swap_count: 0,
    fake_door_tiktok_clicks: 0, fake_door_delivery_clicks: 0, whatsapp_share_clicked: 0, plan_copied: 0,
    tour_skipped: false, tour_completed: false, time_spent_seconds: 0, first_session: true, events: [],
  };
}

/** Tour step each guided action belongs to, so we can tell guided taps from voluntary ones. */
export const eventTourStep: Partial<Record<EventName, number>> = { accepted_week_clicked: 1, mode_switched: 1, deal_added_to_plan: 2, receipt_scan_tried: 3 };

/** Applies one event to a session: logs it and updates the matching flag or counter. */
export function applyEvent(s: ExperimentSession, e: EventName, tourStep: number | null, now = new Date()): ExperimentSession {
  const step = eventTourStep[e];
  const ev: StudyEvent = { e, at: now.toISOString(), in_tour: step !== undefined && tourStep === step, first_session: s.visits <= 1 };
  const n: ExperimentSession = { ...s, events: [...s.events, ev].slice(-400) };
  switch (e) {
    case "accepted_week_clicked": n.accepted_week_clicked = true; break;
    case "mode_switched": n.mode_switched = true; break;
    case "receipt_scan_tried": n.receipt_scan_tried = true; break;
    case "deal_added_to_plan": n.deal_added_to_plan++; break;
    case "swap": n.swap_count++; break;
    case "fake_door_tiktok": n.fake_door_tiktok_clicks++; break;
    case "fake_door_delivery": n.fake_door_delivery_clicks++; break;
    case "whatsapp_share_clicked": n.whatsapp_share_clicked++; break;
    case "plan_copied": n.plan_copied++; break;
    case "ig_follow_clicked": n.ig_follow_clicked = true; break;
    case "cta_clicked": n.cta_clicked = true; break;
    case "tour_skipped": n.tour_skipped = true; break;
    case "tour_completed": n.tour_completed = true; break;
    default: break;
  }
  return n;
}

export const isEmail = (v: string | null | undefined) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
