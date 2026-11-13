import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Plus } from "lucide-react";
import { eur, useApp } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { createSharedPlan } from "@/lib/experiment.functions";
import { dailyPicks } from "@/data/plan";
import { perPerson, shareText } from "@/lib/week";
import { useWeek } from "@/lib/use-week";
import { useLivePlan } from "@/lib/live-plan";
import { Button } from "./ui";

/** Share the current plan with flatmates on WhatsApp, or copy it. */
export function SharePlan() {
  const { store, mode, chosen, people, pick, set } = useApp();
  const create = useServerFn(createSharedPlan);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { cards } = useWeek();
  const planning = useLivePlan();
  const daily = dailyPicks.find((p) => p.id === pick) ?? dailyPicks[0]!;
  const dinners = mode === "prep" ? cards.map((c) => ({ day: c.day, title: c.meal.title })) : [{ day: "Tonight", title: daily.title }];
  const total = mode === "prep" ? planning.weekTotal(cards) : daily.price;
  const items = planning.items(cards).filter((i) => !i.inFridge).map((i) => i.name);

  const buildText = async () => {
    const s = useExp.getState().session;
    let link: string | null = null;
    try {
      const r = await create({ data: { sharer_session_id: s?.session_id ?? null, store, mode, people, total, plan: { chosen, dinners, items } } });
      if (r.ok) link = `${window.location.origin}/p/${r.id}?ref=${s?.my_ref ?? "direct"}&utm_source=whatsapp_share`;
    } catch { /* share without a link rather than a broken one */ }
    return shareText({ store, dinners, total, people, items, link });
  };

  const whatsapp = async () => {
    useExp.getState().track("whatsapp_share_clicked");
    // Open the tab first so pop-up blockers allow it, then fill in the address.
    const w = window.open("", "_blank");
    setBusy(true);
    const text = encodeURIComponent(await buildText());
    setBusy(false);
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = mobile ? `https://wa.me/?text=${text}` : `https://web.whatsapp.com/send?text=${text}`;
    if (w) w.location.href = url; else window.location.href = url;
  };
  const copy = async () => {
    useExp.getState().track("plan_copied");
    setBusy(true);
    const text = await buildText();
    setBusy(false);
    try { await navigator.clipboard.writeText(text); setCopied(true); setFallback(null); setTimeout(() => setCopied(false), 2500); }
    catch { setFallback(text); }
  };

  return (
    <section aria-labelledby="share-h" className="rounded-sheet bg-sheet p-5">
      <h2 id="share-h" className="text-[19px] font-bold">Share this plan with your flatmates</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-[14.5px]">Split between</span>
        <div className="inline-flex items-center gap-1">
          <button type="button" aria-label="One person fewer" disabled={people <= 1} onClick={() => set({ people: people - 1 })} className="press flex size-10 items-center justify-center bg-sheet-2 disabled:opacity-40"><Minus className="size-4" /></button>
          <span className="num w-8 text-center text-[17px] font-semibold" aria-live="polite">{people}</span>
          <button type="button" aria-label="One person more" disabled={people >= 6} onClick={() => set({ people: people + 1 })} className="press flex size-10 items-center justify-center bg-sheet-2 disabled:opacity-40"><Plus className="size-4" /></button>
        </div>
        <span className="text-[14.5px]">{people === 1 ? "person" : "people"}</span>
        <span className="num text-[15px] text-muted-foreground">{eur(perPerson(total, people))} each</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="font-bold" disabled={busy} onClick={() => void whatsapp()}>Share on WhatsApp</Button>
        <Button variant="secondary" disabled={busy} onClick={() => void copy()}>{copied ? "Copied" : "Copy plan"}</Button>
      </div>
      {fallback && (
        <div className="mt-3">
          <p className="text-[13.5px] text-muted-foreground">Copying didn't work here. Select the text below and copy it.</p>
          <textarea readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} className="mt-1 h-40 w-full rounded-ctl bg-sheet-2 p-3 text-[13.5px]" />
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-muted-foreground">Sample prices, no guarantee.</p>
    </section>
  );
}
