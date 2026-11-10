import type { ExperimentSession } from "@/lib/experiment-types";
import { fallbackOptions, featureOptions, householdOptions, painOptions, receiptOptions, spendOptions, storeOptions, workaroundOptions } from "./survey";

/** Deterministic pseudo-random numbers, so the 28 sample students are the same on every load. */
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}
function pick<T>(r: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) { x -= weights[i]!; if (x <= 0) return items[i]!; }
  return items[items.length - 1]!;
}

let cache: ExperimentSession[] | null = null;

/** 28 sample Lisbon student responses, built on first use. */
export function getMockExperimentData(): ExperimentSession[] {
  if (cache) return cache;
  const r = rng(46);
  cache = Array.from({ length: 28 }, (_, i) => {
    const planA = i % 2 === 0;
    const cta1 = Math.floor(i / 2) % 2 === 0;
    const pre = r() < 0.93;
    const accepted = r() < (planA ? 0.71 : 0.57);
    const post = pre && r() < 0.86;
    const converted = post ? r() < (cta1 ? 0.62 : 0.36) : null;
    const day = 3 + Math.floor(i / 4);
    return {
      session_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      created_at: `2026-11-${String(day).padStart(2, "0")}T${String(10 + (i % 9)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00.000Z`,
      ab_plan_variant: planA ? "A_weekly_prep" : "B_daily_pick",
      ab_cta_variant: cta1 ? "1_receipt_cashback" : "2_student_paid_pass",
      survey_pre_completed: pre,
      household_size: pre ? pick(r, householdOptions, [15, 8, 3, 2]) : null,
      fallback_nights: pre ? pick(r, fallbackOptions, [2, 10, 11, 5]) : null,
      top_pain: pre ? pick(r, painOptions, [11, 6, 4, 6, 3]) : null,
      current_workaround: pre ? pick(r, workaroundOptions, [11, 8, 5, 4]) : null,
      preferred_store: pre ? pick(r, storeOptions, [9, 8, 7, 2, 2]) : null,
      weekly_spend: pre ? pick(r, spendOptions, [6, 12, 7, 3]) : null,
      initial_mode_switched: r() < (planA ? 0.43 : 0.64),
      accepted_week_clicked: accepted,
      synergy_filter_used: r() < (planA ? 0.68 : 0.32),
      swapped_meal_clicked: r() < 0.46,
      deals_tab_visited: r() < 0.75,
      fridge_receipt_scanned: r() < 0.39,
      cook_tab_visited: r() < 0.54,
      time_spent_seconds: 70 + Math.floor(r() * 150),
      survey_post_completed: post,
      winning_feature: post ? pick(r, featureOptions, [10, 6, 5, 3]) : null,
      receipt_willingness: post ? pick(r, receiptOptions, [8, 11, 4]) : null,
      open_feedback: null,
      cta_converted: converted,
      contact_left: !!converted && r() < 0.8,
      contact: null,
    } satisfies ExperimentSession;
  });
  return cache;
}
