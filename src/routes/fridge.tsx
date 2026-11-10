import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Carrot, CookingPot, Egg, Package, Pencil, ReceiptText, type LucideIcon } from "lucide-react";
import type { FridgeItem } from "@/data/fridge";
import { useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { receiptRaw, receiptRead } from "@/data/fridge";
import { Button, Chip, PageHeader, TwoCol } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useExp } from "@/lib/experiment";

export const Route = createFileRoute("/fridge")({
  head: pageHead("Fridge", "Your fridge inventory, filled from your supermarket receipts."),
  component: Fridge,
});

const cats: Record<string, { label: string; icon: LucideIcon }> = {
  veg: { label: "Vegetable", icon: Carrot },
  prep: { label: "Cooked prep", icon: CookingPot },
  dairy: { label: "Dairy", icon: Egg },
  pantry: { label: "Pantry", icon: Package },
};
const categoryOf = (id: string) => cats[id === "chicken" || id === "potatoes" ? "prep" : id === "eggs" ? "dairy" : id === "rice" || id === "chickpeas" ? "pantry" : "veg"]!;
const sourceOf = (f: FridgeItem) =>
  f.id === "chicken" || f.id === "potatoes" ? { label: "From Sunday prep", prep: true }
  : ["carrots", "chickpeas", "peppers", "rice"].includes(f.id) ? { label: "From Lidl receipt", prep: false }
  : { label: "From Pingo Doce receipt", prep: false };

function Fridge() {
  const { fridge, set } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<"start" | "reading" | "review" | "done">("start");
  const fileRef = useRef<HTMLInputElement>(null);
  const spinach = fridge.find((f) => f.id === "spinach");

  const startScan = () => {
    useExp.getState().track("fridge_receipt_scanned");
    useExp.getState().track("task_5_fridge");
    setStep("reading");
    setTimeout(() => setStep("review"), 1200);
  };

  return (
    <>
      <PageHeader small={`${fridge.length} items tracked`} title="Your fridge, filled from your receipts"
        sub="Scan the receipt after shopping. Cooking a planned meal takes its ingredients off the list, so nothing needs typing." />
      {spinach && spinach.daysLeft !== null && spinach.daysLeft <= 1 && (
        <div role="status" className="mb-6 flex flex-col gap-3 rounded-[16px] bg-tomato-tint p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px]"><span className="font-semibold text-tomato">Spinach expires tomorrow.</span> Chicken and spinach rice uses it tonight.</p>
          <Button onClick={() => { set({ mode: "daily", pick: "rice" }); navigate({ to: "/plan" }); }}>Plan it for tonight</Button>
        </div>
      )}
      <TwoCol
        main={
          <ul className="space-y-2.5">
            {fridge.map((f) => {
              const low = f.daysLeft !== null && f.daysLeft <= 2;
              const pct = f.daysLeft === null ? 1 : Math.max(0.05, Math.min(1, f.daysLeft / f.maxDays));
              const filled = Math.max(1, Math.round(pct * 5));
              const cat = categoryOf(f.id);
              const Icon = cat.icon;
              const src = sourceOf(f);
              return (
                <li key={f.id + f.name} className={cn("card flex bg-sheet items-center gap-3 p-3.5", f.isNew && "slide-in", low && "border-tomato/40")}>
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[12px]", low ? "bg-tomato-tint text-tomato" : "bg-sheet-2 text-ink")} title={cat.label}>
                    <Icon className="size-5" strokeWidth={1.7} aria-hidden /><span className="sr-only">{cat.label}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[15.5px] font-semibold">{f.name.replace(/ \(from Sunday\)/, "")}</span>
                      <Chip tone={low ? "tomato" : "neutral"} className="num">{f.daysLeft === null ? "long life" : `${f.daysLeft} ${f.daysLeft === 1 ? "day" : "days"} left`}</Chip>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex flex-1 gap-1" aria-hidden>
                        {[0, 1, 2, 3, 4].map((k) => <span key={k} className={cn("h-2 flex-1 rounded-full", k < filled ? (low ? "bg-tomato" : "bg-basil") : "bg-sheet-2")} />)}
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", src.prep ? "bg-mustard-tint text-[var(--mustard-ink)]" : "bg-sheet-2 text-muted-foreground")}>{src.label}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        }
        side={
          <section aria-labelledby="rs" className="thermal rounded-[4px] bg-paper px-5 shadow-[var(--shadow-sheet)]">
            <h2 id="rs" className="flex items-center gap-2 pt-2 text-[19px] font-bold"><ReceiptText className="size-5 text-muted-foreground" aria-hidden />Receipt scan</h2>
            <div aria-hidden className="mt-2 border-t-2 border-dashed border-rule" />
            {step === "start" && (
              <>
                <p className="mt-1 text-[13px] text-muted-foreground">Take a photo of the receipt. We read the abbreviations and you confirm in a few seconds.</p>
                <label htmlFor="receipt" className="sr-only">Receipt photo</label>
                <input id="receipt" ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={startScan} />
                <Button className="mt-4" onClick={() => { useExp.getState().track("task_5_fridge"); fileRef.current?.click(); }}>Scan a receipt</Button>
                <button type="button" onClick={startScan} className="ml-3 min-h-11 text-[13px] font-medium text-muted-foreground underline underline-offset-4">Use the sample receipt</button>
              </>
            )}
            {step === "reading" && (
              <div className="mt-4" aria-live="polite">
                <p className="text-[13px] text-muted-foreground">Reading receipt</p>
                <div className="mt-2 space-y-2">{[90, 70, 80, 60, 75].map((w, i) => <div key={i} className="shimmer h-4 rounded-chip" style={{ width: `${w}%` }} />)}</div>
              </div>
            )}
            {step === "review" && (
              <div className="slide-in mt-4">
                <pre className="overflow-x-auto rounded-[4px] bg-sheet-2 p-3 font-mono text-[12px] leading-relaxed">
                  {receiptRaw.map(([a, b]) => `${a!.padEnd(22)}${b!.padStart(9)}`).join("\n")}
                </pre>
                <ul className="mt-4 divide-y divide-rule">
                  {receiptRead.map((r) => (
                    <li key={r.raw} className="flex items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium">{r.item.name}</p>
                        <p className="text-[12px] text-muted-foreground">from {r.raw}</p>
                      </div>
                      <Chip tone="basil">read</Chip>
                      <button type="button" aria-label={`Edit ${r.item.name}`} onClick={() => toast("Coming later: edit a line before adding it.")} className="flex size-11 items-center justify-center rounded-ctl text-muted-foreground hover:bg-sheet-2 hover:text-ink">
                        <Pencil className="size-4" strokeWidth={1.6} />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button className="mt-4 w-full" onClick={() => {
                  const existing = new Set(fridge.map((f) => f.id));
                  set({ fridge: [...receiptRead.filter((r) => !existing.has(r.item.id)).map((r) => ({ ...r.item, isNew: true })), ...fridge] });
                  setStep("done");
                }}>Add 4 items to my fridge</Button>
              </div>
            )}
            {step === "done" && (
              <div className="slide-in mt-3">
                <p className="text-[15px]">4 items added. The real prices from this receipt also correct our price data for Lidl.</p>
                <Button variant="secondary" className="mt-4" onClick={() => setStep("start")}>Scan another receipt</Button>
              </div>
            )}
          </section>
        }
      />
    </>
  );
}
