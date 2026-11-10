import { useState } from "react";
import { CalendarDays, ReceiptText, ShieldCheck, Timer, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useExp } from "@/lib/experiment";
import { featureOptions, receiptOptions } from "@/data/survey";
import { Button } from "./ui";
import { cn } from "@/lib/utils";

const featureIcons: LucideIcon[] = [CalendarDays, Timer, ShieldCheck, ReceiptText];

const ctaCopy = {
  "1_receipt_cashback": {
    badge: "Free Concierge Pilot · Cashback",
    title: "Get €2.00 cashback on your next supermarket receipt",
    text: "Join our Lisbon student pilot. Send a photo of your next Pingo Doce, Continente or Lidl receipt and get a custom 4-day meal plan plus €2.00 cashback.",
    button: "Claim free pilot spot + €2.00 cashback",
  },
  "2_student_paid_pass": {
    badge: "Sobra Student Pass · Early Access",
    title: "Save ~€18/week on groceries for €1.99/month",
    text: "Lock in early-bird student access for €1.99/month after a free 14-day trial. Cancel anytime, zero charge today.",
    button: "Reserve €1.99/mo student pass",
  },
} as const;

export function VerdictModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useExp((x) => x.session);
  const update = useExp((x) => x.update);
  const [feature, setFeature] = useState("");
  const [receipt, setReceipt] = useState("");
  const [feedback, setFeedback] = useState("");
  const [contact, setContact] = useState("");
  if (!s) return null;
  const cta = ctaCopy[s.ab_cta_variant];

  const submit = (converted: boolean) => {
    const c = contact.trim();
    update({
      winning_feature: feature || null, receipt_willingness: receipt || null, open_feedback: feedback.trim() || null,
      cta_converted: converted, contact: c || null, contact_left: !!c, survey_post_completed: true,
    });
    onOpenChange(false);
    toast(converted ? "Thank you. We'll be in touch about the pilot." : "Thank you, your feedback is saved.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[620px] overflow-y-auto rounded-[20px] border-rule bg-sheet p-5 md:p-7">
        <DialogTitle className="font-serif text-[24px] font-bold">Last 2 questions: what stood out?</DialogTitle>
        <DialogDescription className="sr-only">Pick the feature you would keep, tell us about receipts, then choose whether to join.</DialogDescription>

        <fieldset className="mt-2">
          <legend className="mb-3 text-[15px] font-semibold">If Sobra only kept ONE feature, which one would make you use it next week?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {featureOptions.map((o, i) => {
              const Icon = featureIcons[i]!; const on = feature === o; const [head, rest] = o.split(": ");
              return (
                <button key={o} type="button" aria-pressed={on} onClick={() => setFeature(o)}
                  className={cn("press rounded-[14px] border p-3 text-left", on ? "border-basil bg-basil-tint" : "border-rule bg-sheet hover:bg-sheet-2")}>
                  <Icon className={cn("size-5", on ? "text-basil" : "text-muted-foreground")} strokeWidth={1.7} aria-hidden />
                  <span className="mt-1.5 block font-serif text-[15.5px] font-semibold">{head}</span>
                  <span className="block text-[13px] leading-snug text-muted-foreground">{rest}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-[15px] font-semibold">Would you take 5 seconds after shopping to photograph your receipt so Sobra tracks your fridge?</legend>
          <div className="divide-y divide-rule rounded-[14px] border border-rule">
            {receiptOptions.map((o) => (
              <label key={o} className="flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2 text-[14.5px]">
                <input type="radio" name="receipt" checked={receipt === o} onChange={() => setReceipt(o)} className="size-4 accent-[var(--basil)]" />{o}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block">
          <span className="mb-2 block text-[15px] font-semibold">Anything missing, confusing, or unrealistic? (optional)</span>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} rows={2} className="w-full rounded-[12px] bg-sheet-2 px-3 py-2 text-[14.5px]" />
        </label>

        <section className="mt-5 rounded-[16px] bg-basil-tint p-4 md:p-5">
          <span className="inline-flex rounded-full bg-sheet px-2.5 py-0.5 text-[12px] font-semibold text-basil">{cta.badge}</span>
          <h3 className="mt-2 text-[20px] font-bold">{cta.title}</h3>
          <p className="mt-1 text-[14px] text-muted-foreground">{cta.text}</p>
          <label className="mt-3 block">
            <span className="sr-only">Your WhatsApp number or email (optional, for pilot access)</span>
            <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} placeholder="Your WhatsApp number or email (optional, for pilot access)" className="min-h-11 w-full rounded-[12px] bg-sheet px-3 text-[14.5px]" />
          </label>
          <Button className="mt-3 w-full" onClick={() => submit(true)}>{cta.button}</Button>
        </section>
        <Button variant="quiet" className="mx-auto" onClick={() => submit(false)}>Just submit my feedback without joining</Button>
      </DialogContent>
    </Dialog>
  );
}
