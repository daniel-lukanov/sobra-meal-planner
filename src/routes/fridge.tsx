import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { receiptRaw, receiptRead } from "@/data/fridge";
import { Button, Chip, PageHeader, TwoCol } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/fridge")({
  head: pageHead("Fridge", "Your fridge inventory, filled from your supermarket receipts."),
  component: Fridge,
});

function Fridge() {
  const { fridge, set } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<"start" | "reading" | "review" | "done">("start");
  const fileRef = useRef<HTMLInputElement>(null);
  const spinach = fridge.find((f) => f.id === "spinach");

  const startScan = () => {
    setStep("reading");
    setTimeout(() => setStep("review"), 1200);
  };

  return (
    <>
      <PageHeader small={`${fridge.length} items tracked`} title="Your fridge, filled from your receipts"
        sub="Scan the receipt after shopping. Cooking a planned meal takes its ingredients off the list, so nothing needs typing." />
      {spinach && spinach.daysLeft !== null && spinach.daysLeft <= 1 && (
        <div role="status" className="mb-7 flex flex-col gap-3 rounded-block bg-tomato-tint p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px]"><span className="font-semibold text-tomato">Spinach expires tomorrow.</span> Chicken and spinach rice uses it tonight.</p>
          <Button onClick={() => { set({ mode: "daily", pick: "rice" }); navigate({ to: "/plan" }); }}>Plan it for tonight</Button>
        </div>
      )}
      <TwoCol
        main={
          <ul className="divide-y divide-rule border-y border-rule">
            {fridge.map((f) => {
              const low = f.daysLeft !== null && f.daysLeft <= 2;
              const pct = f.daysLeft === null ? 100 : Math.max(6, Math.min(100, (f.daysLeft / f.maxDays) * 100));
              return (
                <li key={f.id + f.name} className={cn("py-4", f.isNew && "slide-in")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[15.5px] font-medium">{f.name}</span>
                    <Chip tone={low ? "tomato" : "neutral"} className="num">{f.daysLeft === null ? "long life" : `${f.daysLeft} ${f.daysLeft === 1 ? "day" : "days"} left`}</Chip>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-sheet-2" aria-hidden>
                    <div className={cn("h-full rounded-full", low ? "bg-tomato" : "bg-basil")} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        }
        side={
          <section aria-labelledby="rs">
            <h2 id="rs" className="text-[18px]">Receipt scan</h2>
            {step === "start" && (
              <>
                <p className="mt-1 text-[13px] text-muted-foreground">Take a photo of the receipt. We read the abbreviations and you confirm in a few seconds.</p>
                <label htmlFor="receipt" className="sr-only">Receipt photo</label>
                <input id="receipt" ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={startScan} />
                <Button className="mt-4" onClick={() => fileRef.current?.click()}>Scan a receipt</Button>
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
                <pre className="torn rounded-t-[6px] bg-sheet-2 p-3 font-mono text-[12.5px] leading-relaxed">
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
