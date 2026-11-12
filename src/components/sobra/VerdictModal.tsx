import { useState, type ReactNode } from "react";
import { Check, Minus, Plus, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useExp } from "@/lib/experiment";
import type { CtaVariant } from "@/lib/experiment-types";
import { featureKeys, featureLabels, modeOptions, pmfOptions, receiptOptions, switchOptions, synergyOptions, timingOptions, wasteOptions, wtpOptions, type FeatureKey } from "@/data/survey";
import { Button } from "./ui";
import { Pill, Q } from "./PreSurvey";
import { cn } from "@/lib/utils";

export const ctaCopy: Record<CtaVariant, { badge: string; title: string; text: string; button: string }> = {
  C1_free_receipt_cashback: {
    badge: "Free Student Pilot · Cashback Reward",
    title: "Join the Sobra Lisbon Pilot + Get €2.00 Receipt Cashback",
    text: "Get early access to Sobra for free and earn €2.00 cashback when you scan your first Pingo Doce, Continente or Lidl receipt.",
    button: "Claim Free Pilot + €2.00 Cashback",
  },
  C2_paid_199_student: {
    badge: "Sobra Student Pro · 1st Month 100% Free",
    title: "Save ~€18/week on groceries for €1.99/month (First month FREE)",
    text: "Lock in the Student Pro rate (€1.99/month after your first full month 100% free). Cancel in 1 tap anytime, €0 charged today.",
    button: "Claim 1st Month Free (€1.99/mo plan)",
  },
  C3_paid_399_household: {
    badge: "Sobra Household Pro · 1st Month 100% Free",
    title: "Full Deal Sync & Smart Fridge for €3.99/month (First month FREE)",
    text: "Saves €60+/month on groceries for 1–2 people. Get your first full month 100% free, then €3.99/month. Zero charge today.",
    button: "Claim 1st Month Free (€3.99/mo plan)",
  },
};

const shareText = encodeURIComponent("I just tried Sobra, a Lisbon meal planner built from real supermarket deals. Try it and we both get an extra free month: https://slide-into-motion.lovable.app/?ref=whatsapp");
const emptyPoints = (): Record<FeatureKey, number> => ({ synergy_prep: 20, verified_deals: 20, receipt_fridge: 20, reel_checker: 20, cook_mode: 20 });

export function VerdictModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useExp((x) => x.session);
  const update = useExp((x) => x.update);
  const [mode, setMode] = useState(""); const [rec, setRec] = useState(""); const [pmf, setPmf] = useState(""); const [contact, setContact] = useState("");
  const [bonusOpen, setBonusOpen] = useState(false);
  const [q9, setQ9] = useState(""); const [q10, setQ10] = useState(""); const [q11, setQ11] = useState<string[]>([]); const [q12, setQ12] = useState("");
  const [pts, setPts] = useState(emptyPoints); const [q14, setQ14] = useState(""); const [q15, setQ15] = useState("");
  if (!s) return null;
  const cta = ctaCopy[s.ab_cta_variant];
  const stage1Ready = mode && rec && pmf;
  const used = Object.values(pts).reduce((a, b) => a + b, 0);
  const bonusReady = q9 && q10 && q11.length > 0 && q12 && used === 100 && q14;

  const submit1 = (converted: boolean) => {
    const c = contact.trim();
    update({ q6_mode_winner: mode, q7_receipt_habit: rec, q8_pmf_score: pmf, cta_converted: converted, contact_left: c.length > 0, contact: c || null, survey_post_completed: true }, true);
  };
  const submit2 = () => {
    update({ q9_last_dinner_timing: q9, q10_switch_threshold: q10, q11_wasted_items: q11, q12_synergy_attitude: q12, q13_buy_a_feature: pts, q14_stated_wtp: q14, q15_open_feedback: q15.trim() || null, bonus_completed: true }, true);
  };
  const share = () => { update({ shared_on_whatsapp: true }, true); window.open(`https://wa.me/?text=${shareText}`, "_blank", "noopener"); };
  const toggleWaste = (o: string) => setQ11((cur) => o === "None" ? ["None"] : cur.includes(o) ? cur.filter((x) => x !== o) : [...cur.filter((x) => x !== "None"), o]);
  const adjust = (k: FeatureKey, d: number) => setPts((p) => { const v = p[k] + d; return v < 0 || v > 100 || used + d > 100 ? p : { ...p, [k]: v }; });

  const ShareBtn = () => (
    <Button variant="secondary" onClick={share}><Share2 className="size-4" aria-hidden />Share on WhatsApp with a flatmate (+1 extra free month)</Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-sheet bg-sheet p-6 sm:p-8">
        {!s.survey_post_completed ? (
          <>
            <DialogTitle className="text-[24px] font-bold">Your 25-second verdict</DialogTitle>
            <DialogDescription className="text-muted-foreground">Three taps, then claim your free month.</DialogDescription>
            <div className="mt-4 space-y-6">
              <Q title="6. After trying Sobra, which mode fits your real week in Lisbon?">
                <div className="space-y-2">{modeOptions.map((o) => <Card key={o} on={mode === o} onClick={() => setMode(o)}>{o}</Card>)}</div>
              </Q>
              <Q title="7. How would you want Sobra to keep track of what is in your fridge?">
                <div className="space-y-2">{receiptOptions.map((o) => <Card key={o} on={rec === o} onClick={() => setRec(o)}>{o}</Card>)}</div>
              </Q>
              <Q title="8. If Sobra launched in Lisbon next month with live Pingo Doce, Continente & Lidl prices, how disappointed would you be if you could NOT use it?">
                <div className="flex flex-wrap gap-2">{pmfOptions.map((o) => <Pill key={o} on={pmf === o} onClick={() => setPmf(o)}>{o}</Pill>)}</div>
              </Q>
              <section className="rounded-sheet bg-basil-tint p-5" aria-labelledby="cta-t">
                <span className="inline-flex rounded-[6px] bg-sheet px-3 py-1 text-[12.5px] font-semibold text-basil">{cta.badge}</span>
                <h3 id="cta-t" className="mt-3 text-[20px] font-bold">{cta.title}</h3>
                <p className="mt-1 text-[14px]">{cta.text}</p>
                <label htmlFor="contact" className="mt-4 block text-[13px] font-medium">Your email or WhatsApp number (optional, to send your free month code)</label>
                <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="email" className="mt-1.5 min-h-11 w-full rounded-ctl bg-sheet px-3" />
                <Button className="mt-4 w-full" disabled={!stage1Ready} onClick={() => submit1(true)}>{cta.button}</Button>
                {!stage1Ready && <p className="mt-2 text-[12.5px] text-muted-foreground">Answer questions 6 to 8 first.</p>}
              </section>
              <Button variant="quiet" className="w-full" disabled={!stage1Ready} onClick={() => submit1(false)}>Submit my 8 answers without claiming the offer</Button>
            </div>
          </>
        ) : s.bonus_completed ? (
          <div className="text-center">
            <DialogTitle className="text-[24px] font-bold">Your VIP code is ready</DialogTitle>
            <DialogDescription className="mt-1 text-muted-foreground">3 months of Sobra Pro free plus a €2.00 voucher. Thank you for helping the Católica team.</DialogDescription>
            <p className="num mx-auto mt-5 inline-block rounded-sheet border-2 border-dashed border-basil bg-basil-tint px-6 py-4 text-[28px] font-bold tracking-wide text-basil">SOBRA-VIP-FREE</p>
            <div className="mt-6 flex flex-col items-center gap-2"><ShareBtn /><Button variant="quiet" onClick={() => onOpenChange(false)}>Back to Sobra</Button></div>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-sheet border border-mustard bg-mustard-tint p-4">
              <DialogTitle className="flex items-center gap-2 text-[17px] font-bold"><Check className="size-5 text-basil" strokeWidth={3} aria-hidden />Stage 1 saved!</DialogTitle>
              <DialogDescription className="mt-1 text-[14px] text-ink">Want to upgrade your reward to 3 Months of Sobra Pro 100% FREE + a €2.00 Lidl/Continente voucher? Answer 7 quick bonus questions (45 sec) for our Católica thesis team:</DialogDescription>
            </div>
            {!bonusOpen ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setBonusOpen(true)}>Unlock 7 Bonus Questions (45 sec)</Button>
                <Button variant="secondary" onClick={() => onOpenChange(false)}>No thanks, return to Sobra</Button>
                <ShareBtn />
              </div>
            ) : (
              <div className="space-y-6">
                <Q title="9. Think about the last dinner you cooked. When did you decide what to make?">
                  <div className="flex flex-wrap gap-2">{timingOptions.map((o) => <Pill key={o} on={q9 === o} onClick={() => setQ9(o)}>{o}</Pill>)}</div>
                </Q>
                <Q title="10. If another supermarket 12 minutes further away had cheaper deals on your weekly list, when would you walk there?">
                  <div className="flex flex-wrap gap-2">{switchOptions.map((o) => <Pill key={o} on={q10 === o} onClick={() => setQ10(o)}>{o}</Pill>)}</div>
                </Q>
                <Q title="11. In the last 14 days, which items did you throw away because the pack was too big or expired?">
                  <div className="flex flex-wrap gap-2">{wasteOptions.map((o) => <Pill key={o} on={q11.includes(o)} onClick={() => toggleWaste(o)}>{o}</Pill>)}</div>
                </Q>
                <Q title="12. How do you feel about cooking 1.5 kg of potatoes on Sunday if Sobra turns them into 3 completely different meals (Roast chicken, Tuna salad, Tortilla)?">
                  <div className="space-y-2">{synergyOptions.map((o) => <Card key={o} on={q12 === o} onClick={() => setQ12(o)}>{o}</Card>)}</div>
                </Q>
                <Q title="13. Allocate 100 points across Sobra's 5 features based on what matters most to you:">
                  <p className="num mb-2 text-[13px] font-semibold" aria-live="polite">{100 - used} points left</p>
                  <ul className="space-y-2">
                    {featureKeys.map((k, i) => (
                      <li key={k} className="flex items-center gap-3 rounded-[8px] bg-row p-3">
                        <span className="min-w-0 flex-1 text-[14px] font-medium">{i + 1}. {featureLabels[k]}</span>
                        <button type="button" aria-label={`Remove 20 points from ${featureLabels[k]}`} onClick={() => adjust(k, -20)} className="press flex size-9 items-center justify-center rounded-full bg-sheet-2"><Minus className="size-4" /></button>
                        <span className="num w-9 text-center text-[17px] font-bold">{pts[k]}</span>
                        <button type="button" aria-label={`Add 20 points to ${featureLabels[k]}`} onClick={() => adjust(k, 20)} className="press flex size-9 items-center justify-center rounded-full bg-basil text-basil-ink"><Plus className="size-4" /></button>
                      </li>
                    ))}
                  </ul>
                </Q>
                <Q title="14. If Sobra saves you ~€18/week on groceries, what is the maximum you would realistically pay?">
                  <div className="space-y-2">{wtpOptions.map((o) => <Card key={o} on={q14 === o} onClick={() => setQ14(o)}>{o}</Card>)}</div>
                </Q>
                <Q title="15. What is the #1 reason you might stop using Sobra after 2 weeks, or what felt missing?">
                  <label htmlFor="q15" className="sr-only">Your answer</label>
                  <input id="q15" value={q15} onChange={(e) => setQ15(e.target.value)} maxLength={500} className="min-h-11 w-full rounded-ctl bg-sheet px-3" />
                </Q>
                <Button className="w-full" disabled={!bonusReady} onClick={submit2}>Submit Bonus Answers &amp; Reveal VIP Code -&gt;</Button>
                {!bonusReady && <p className="text-[12.5px] text-muted-foreground">Answer 9 to 14 and spend all 100 points to reveal the code.</p>}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Card({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press flex min-h-12 w-full items-center rounded-[8px] border px-3.5 py-2.5 text-left text-[14.5px]", on ? "border-basil bg-basil-tint font-semibold" : "border-rule bg-sheet hover:bg-sheet-2")}>{children}</button>
  );
}
