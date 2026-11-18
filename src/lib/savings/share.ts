import { praticoDb } from "@/integrations/pratico-db/client";
import { translate, money, type Lang } from "@/lib/i18n";
import type { Result } from "./engine";

/** Saves a snapshot and returns its id, or null when it could not be saved (the text is then shared without a link). */
export async function createShared(sessionId: string, res: Result): Promise<string | null> {
  try {
    const { data, error } = await praticoDb.rpc("share_result_create", { p_session: sessionId, p_store: res.userStore, p_saving: res.saving, p_cheapest: res.cheapestStore });
    return error || !data ? null : data;
  } catch { return null; }
}

export function shareLink(origin: string, id: string | null, ref: string): string {
  return id ? `${origin}/s/${id}?ref=${encodeURIComponent(ref)}&utm_source=whatsapp_share` : origin;
}

/** Plain text, no emoji, built from the numbers on screen. */
export function shareText(lang: Lang, res: Result, manual: boolean, link: string | null): string {
  const body = translate(lang, manual ? "share.text_manual" : "share.text", { store: res.userStore, saving: money(res.saving, lang), cheapest: res.cheapestStore });
  return [`${body}${link ? ` ${link}` : ""}`, translate(lang, "price.note")].join("\n");
}

export function whatsappUrl(text: string, desktop: boolean): string {
  const q = encodeURIComponent(text);
  return desktop ? `https://web.whatsapp.com/send?text=${q}` : `https://wa.me/?text=${q}`;
}
export const isDesktop = () => typeof navigator !== "undefined" && !/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
