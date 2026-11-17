import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useExp } from "@/lib/experiment";
import { isEmail, type CtaVariant } from "@/lib/experiment-types";
import { STOP_NONE, dealBrandOptions, keepOneOptions, pmfOptions, receiptBlockerOptions, receiptOptions, stopperOptions } from "@/data/survey";
import { Button } from "./ui";
import { Multi, Question, Single, TextLine, useRequired } from "./form";
import { SharePlan } from "./SharePlan";
import { cn } from "@/lib/utils";

export const ctaCopy: Record<CtaVariant, { title: string; text: string; button: string }> = {
  free_pilot: { title: "Join the free pilot", text: "We're testing pratico with students in Lisbon. You get a new plan every Thursday.", button: "Join the free pilot" },
  paid_199: { title: "pratico Student: €1.99 a month, first month free", text: "Nothing is charged now. Cancel anytime.", button: "Reserve my spot" },
};
const IG = "https://www.instagram.com/pratico.lisboa/";

/** Small collapsible entry point for Block 3. Hides while typing so it never covers a field. */
export function FeedbackPill() {
  const open = useExp((s) => s.feedbackOpen);
  const setOpen = useExp((s) => s.setFeedbackOpen);
  const [collapsed, setCollapsed] = useState(false);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    const on = (e: FocusEvent) => { if (isField(e.target)) setTyping(true); };
    const off = (e: FocusEvent) => { if (isField(e.target)) setTyping(false); };
    document.addEventListener("focusin", on); document.addEventListener("focusout", off);
    return () => { document.removeEventListener("focusin", on); document.removeEventListener("focusout", off); };
  }, []);
  return (
    <>
      {!typing && !open && (
        collapsed ? (
          <button type="button" aria-label="Show feedback button" onClick={() => setCollapsed(false)}
            className="fixed bottom-24 right-0 z-30 flex h-10 w-6 items-center justify-center bg-basil text-basil-ink shadow-float md:bottom-8">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        ) : (
          <div className="fixed bottom-20 right-3 z-30 flex items-center bg-basil text-basil-ink shadow-float md:bottom-6 md:right-6">
            <button type="button" onClick={() => setOpen(true)} className="min-h-10 px-4 text-[14px] font-semibold">Give feedback (1 min)</button>
            <button type="button" aria-label="Collapse feedback button" onClick={() => setCollapsed(true)} className="flex min-h-10 w-8 items-center justify-center border-l border-basil-ink/30"><ChevronRight className="size-4" aria-hidden /></button>
          </div>
        )
      )}
      <FinalFeedback open={open} onOpenChange={setOpen} />
    </>
  );
}

function FinalFeedback({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useExp((x) => x.session);
  const update = useExp((x) => x.update);
  const [rec, setRec] = useState<string | null>(null);
  const [recB, setRecB] = useState<string[]>([]);
  const [keep, setKeep] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [pmf, setPmf] = useState<string | null>(null);
  const [stop, setStop] = useState<string[]>([]);
  const [stopOther, setStopOther] = useState("");
  const { errors, check, clear } = useRequired();
  if (!s) return null;

  const submit = () => {
    if (!check([
      { id: "rec", ok: !!rec }, { id: "recb", ok: rec !== "No" || recB.length > 0 },
      { id: "keep", ok: !!keep }, { id: "brand", ok: !!brand }, { id: "pmf", ok: !!pmf }, { id: "stop", ok: stop.length > 0 },
    ])) return;
    update({ b3_receipt: rec, b3_receipt_blockers: rec === "No" ? recB : [], b3_keep_one: keep, b3_deal_brand: brand, b3_pmf: pmf, b3_stoppers: stop, b3_stoppers_other: stopOther.trim() || null, survey_post_completed: true }, true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-16px)] max-w-2xl overflow-y-auto rounded-sheet bg-sheet p-6 sm:p-8">
        {!s.survey_post_completed ? (
          <>
            <DialogTitle className="text-[24px] font-bold">Your feedback</DialogTitle>
            <DialogDescription className="text-muted-foreground">5 questions, about a minute.</DialogDescription>
            <div className="mt-4 space-y-6">
              <Question id="rec" title="After shopping, would you snap your receipt so pratico knows what's in your fridge?" error={errors["rec"]}>
                <Single options={receiptOptions} value={rec} onChange={(v) => { setRec(v); clear("rec"); }} />
              </Question>
              {rec === "No" && (
                <Question id="recb" title="Why not? Select all that apply." error={errors["recb"]}>
                  <Multi options={receiptBlockerOptions} value={recB} onChange={(v) => { setRecB(v); clear("recb"); }} />
                </Question>
              )}
              <Question id="keep" title="If we could keep only one thing, what should stay?" error={errors["keep"]}>
                <Single options={keepOneOptions} value={keep} onChange={(v) => { setKeep(v); clear("keep"); }} />
              </Question>
              <Question id="brand" title="Your plan uses a brand that's on deal, not the one you usually buy. Would you buy it?" error={errors["brand"]}>
                <Single options={dealBrandOptions} value={brand} onChange={(v) => { setBrand(v); clear("brand"); }} />
              </Question>
              <Question id="pmf" title="If pratico didn't launch, how would you feel?" error={errors["pmf"]}>
                <Single options={pmfOptions} value={pmf} onChange={(v) => { setPmf(v); clear("pmf"); }} />
              </Question>
              <Question id="stop" title="What would stop you from using pratico next week? Select all that apply." error={errors["stop"]}>
                <Multi options={stopperOptions} value={stop} exclusive={STOP_NONE} onChange={(v) => { setStop(v); clear("stop"); }} />
                <TextLine id="stop-other" label="Anything else? (optional)" value={stopOther} onChange={setStopOther} />
              </Question>
              <Button className="w-full" onClick={submit}>Send feedback</Button>
            </div>
          </>
        ) : <EndScreen />}
      </DialogContent>
    </Dialog>
  );
}

function EndScreen() {
  const s = useExp((x) => x.session)!;
  const { update, track } = useExp.getState();
  const cta = ctaCopy[s.ab_cta_variant];
  const [contact, setContact] = useState(s.cta_contact ?? "");
  const [contactDone, setContactDone] = useState(!!s.cta_contact);
  const [noThanks, setNoThanks] = useState(false);
  const [email, setEmail] = useState(s.raffle_email ?? (isEmail(s.cta_contact) ? s.cta_contact! : ""));
  const [emailErr, setEmailErr] = useState(false);
  const signup = () => { if (s.ref && s.utm_source === "whatsapp_share" && !s.events.some((e) => e.e === "referral_signup")) track("referral_signup"); };

  const saveContact = () => {
    const c = contact.trim();
    if (!c) { setNoThanks(true); return; }
    update({ cta_contact: c }, true); setContactDone(true);
    if (isEmail(c)) { signup(); if (!email) setEmail(c); }
  };
  const saveRaffle = () => {
    if (!isEmail(email)) { setEmailErr(true); document.getElementById("raffle-email")?.focus(); return; }
    setEmailErr(false); update({ raffle_email: email.trim() }, true); signup();
  };

  return (
    <div className="space-y-6">
      <div>
        <DialogTitle className="text-[24px] font-bold">Thanks, that's really useful</DialogTitle>
        <DialogDescription className="text-muted-foreground">Your answers decide what we build next.</DialogDescription>
      </div>
      <section aria-labelledby="cta-t" className="rounded-sheet bg-basil-tint p-5">
        <h3 id="cta-t" className="text-[20px] font-bold">{cta.title}</h3>
        <p className="mt-1 text-[14px]">{cta.text}</p>
        {!s.cta_clicked ? (
          <Button className="mt-4" onClick={() => track("cta_clicked")}>{cta.button}</Button>
        ) : contactDone ? (
          <p role="status" className="mt-4 text-[14.5px] font-semibold">You're on the list. We'll be in touch.</p>
        ) : noThanks ? (
          <p role="status" className="mt-4 text-[14.5px]">Saved. You can still leave your email for the raffle below.</p>
        ) : (
          <div className="mt-4">
            <label htmlFor="cta-contact" className="text-[13.5px] font-medium">Email or WhatsApp number</label>
            <input id="cta-contact" value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} autoComplete="email" className="mt-1 min-h-11 w-full rounded-ctl bg-sheet px-3" />
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" onClick={saveContact}>Save</Button>
              <button type="button" onClick={() => setNoThanks(true)} className="min-h-10 text-[13.5px] text-muted-foreground underline underline-offset-4">No thanks</button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="raffle-t" className="rounded-sheet bg-sheet-2 p-5">
        <h3 id="raffle-t" className="text-[18px] font-bold">Win a supermarket voucher</h3>
        <p className="mt-1 text-[14px]">Leave your email and follow us on Instagram. We'll contact the winners after 30 November.</p>
        <p className="mt-1 text-[13.5px] text-muted-foreground">Each friend who signs up through your shared plan gets you one more entry.</p>
        {s.raffle_email ? <p role="status" className="mt-3 text-[14.5px] font-semibold">You're in the raffle.</p> : (
          <div className="mt-3">
            <label htmlFor="raffle-email" className="text-[13.5px] font-medium">Email</label>
            <div className="mt-1 flex gap-2">
              <input id="raffle-email" type="email" value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={cn("min-h-11 min-w-0 flex-1 rounded-ctl bg-sheet px-3")} />
              <Button variant="secondary" onClick={saveRaffle}>Enter</Button>
            </div>
            {emailErr && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-tomato">Add a valid email to enter</p>}
          </div>
        )}
        <Button variant="secondary" className="mt-3" onClick={() => { track("ig_follow_clicked"); window.open(IG, "_blank", "noopener"); }}>Follow @pratico.lisboa</Button>
      </section>

      <SharePlan />
    </div>
  );
}
