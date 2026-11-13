import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Carrot, CookingPot, Egg, Package, Pencil, ReceiptText, Trash2, type LucideIcon } from "lucide-react";
import type { FridgeItem, Receipt } from "@/data/fridge";
import { addReceipt, findDuplicate, itemsOf, removeReceipt, restoreReceipt } from "@/lib/receipts";
import { useRef, useState } from "react";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { receiptRaw, receiptRead, sampleReceipt } from "@/data/fridge";
import { useIngredients, useStorageGuidelines } from "@/lib/db-queries";
import { withShelfLife } from "@/lib/shelf-life";
import { FridgeAmount } from "@/components/sobra/FridgeAmount";
import { FRIDGE_SLUG } from "@/lib/household-data";
import { useLivePlan } from "@/lib/live-plan";
import { weekCards } from "@/lib/week";
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
const sourceOf = (f: FridgeItem, receipts: Receipt[]) =>
  f.receiptId ? { label: `From ${receipts.find((r) => r.id === f.receiptId)?.store ?? ""} receipt`.replace("  ", " "), prep: false }
  : f.id === "chicken" || f.id === "potatoes" ? { label: "From Sunday prep", prep: true }
  : ["carrots", "chickpeas", "peppers", "rice"].includes(f.id) ? { label: "From Lidl receipt", prep: false }
  : { label: "From Pingo Doce receipt", prep: false };

function Fridge() {
  const { fridge, receipts, set } = useApp();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const duplicate = findDuplicate(receipts, sampleReceipt);
  const guidelines = useStorageGuidelines(), catalog = useIngredients();
  const planning = useLivePlan();
  const cards = weekCards(useApp((s) => s.chosen));
  const unitOf = (id: string) => catalog.data?.find((i) => i.slug === (FRIDGE_SLUG[id] ?? id))?.base_unit ?? "g";
  const navigate = useNavigate();
  const [step, setStep] = useState<"start" | "reading" | "review" | "done">("start");
  const fileRef = useRef<HTMLInputElement>(null);
  const spinach = fridge.find((f) => f.id === "spinach");

  /** Take one item out (used up, thrown away, or added by mistake). The shopping list needs it again straight away. */
  const removeItem = (f: FridgeItem) => {
    const at = fridge.indexOf(f);
    set({ fridge: fridge.filter((x) => x !== f) });
    toast(`${f.name} taken off your fridge.`, {
      action: { label: "Undo", onClick: () => { const cur = useApp.getState().fridge; useApp.setState({ fridge: [...cur.slice(0, at), f, ...cur.slice(at)] }); } },
    });
  };

  const startScan = () => {
    useExp.getState().track("receipt_scan_tried");
    setStep("reading");
    setTimeout(() => setStep("review"), 1200);
  };

  return (
    <>
      <PageHeader small={`${fridge.length} items tracked`} title="Your fridge, filled from your receipts"
        sub="Snap your receipt after shopping and we add what you bought. When you cook a planned dinner, we take its ingredients off." />
      {spinach && spinach.daysLeft !== null && spinach.daysLeft <= 1 && (
        <div role="status" className="mb-6 flex flex-col gap-3 rounded-[8px] bg-tomato-tint p-4 sm:flex-row sm:items-center sm:justify-between">
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
              const src = sourceOf(f, receipts);
              return (
                <li key={`${f.receiptId ?? "own"}-${f.id}-${f.name}`} className={cn("card flex bg-sheet items-center gap-3 p-3.5", f.isNew && "slide-in", low && "border-tomato/40")}>
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[8px]", low ? "bg-tomato-tint text-tomato" : "bg-sheet-2 text-ink")} title={cat.label}>
                    <Icon className="size-5" strokeWidth={1.7} aria-hidden /><span className="sr-only">{cat.label}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[15.5px] font-semibold">{f.name.replace(/ \(from Sunday\)/, "")}</span>
                      <span className="flex items-center gap-1">
                        <Chip tone={low ? "tomato" : "neutral"} className="num">{f.daysLeft === null ? "long life" : `${f.daysLeft} ${f.daysLeft === 1 ? "day" : "days"} left`}</Chip>
                        <button type="button" aria-label={`Remove ${f.name} from fridge`} onClick={() => removeItem(f)}
                          className="flex size-9 items-center justify-center rounded-ctl text-muted-foreground hover:bg-sheet-2 hover:text-tomato">
                          <Trash2 className="size-4" strokeWidth={1.6} />
                        </button>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex flex-1 gap-1" aria-hidden>
                        {[0, 1, 2, 3, 4].map((k) => <span key={k} className={cn("h-2 flex-1 rounded-full", k < filled ? (low ? "bg-tomato" : "bg-basil") : "bg-sheet-2")} />)}
                      </div>
                      <span className={cn("shrink-0 rounded-[6px] px-2 py-0.5 text-[11.5px] font-semibold", src.prep ? "bg-mustard-tint text-[var(--mustard-ink)]" : "bg-sheet-2 text-muted-foreground")}>{src.label}</span>
                    </div>
                    <FridgeAmount qty={f.qty} unit={unitOf(f.id)} need={planning.needOf(FRIDGE_SLUG[f.id] ?? f.id, cards)}
                      onChange={(qty) => set({ fridge: fridge.map((x) => (x === f ? (({ qty: _q, ...rest }) => ({ ...rest, ...(qty === undefined ? {} : { qty }) }))(x) : x)) })} />
                  </div>
                </li>
              );
            })}
          </ul>
        }
        side={
          <>
          <section aria-labelledby="rs" data-tour="3" className="thermal rounded-[8px] bg-paper px-5">
            <h2 id="rs" className="flex items-center gap-2 pt-2 text-[19px] font-bold"><ReceiptText className="size-5 text-muted-foreground" aria-hidden />Receipt scan</h2>
            <div aria-hidden className="mt-2 border-t-2 border-dashed border-rule" />
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
                <pre className="overflow-x-auto rounded-[8px] bg-sheet-2 p-3 font-mono text-[12px] leading-relaxed">
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
                {duplicate && (
                  <p role="status" className="mt-4 rounded-[8px] bg-mustard-tint p-3 text-[13px]">
                    You already added a receipt from {duplicate.store} on {duplicate.date} for {eur(duplicate.total)}. Adding it again would count everything twice.
                  </p>
                )}
                <Button variant={duplicate ? "secondary" : "primary"} className="mt-4 w-full" onClick={() => {
                  const items = guidelines.data && catalog.data ? withShelfLife(sampleReceipt.items, guidelines.data, catalog.data) : sampleReceipt.items;
                  const next = addReceipt({ fridge, receipts }, { ...sampleReceipt, items });
                  set({ fridge: next.fridge, receipts: next.receipts });
                  setStep("done");
                }}>{duplicate ? "Add it anyway" : `Add ${sampleReceipt.items.length} items to my fridge`}</Button>
                {duplicate && <button type="button" onClick={() => setStep("start")} className="mt-2 min-h-11 w-full text-[13px] font-medium text-muted-foreground underline underline-offset-4">Cancel</button>}
              </div>
            )}
            {step === "done" && (
              <div className="slide-in mt-3">
                <p className="text-[15px]">Items added to your fridge. This is a demo with a sample receipt. Added by mistake? Remove the receipt below and its items go too.</p>
                <Button variant="secondary" className="mt-4" onClick={() => setStep("start")}>Scan another receipt</Button>
              </div>
            )}
          </section>
          {receipts.length > 0 && (
            <section aria-labelledby="rl" className="mt-6">
              <h2 id="rl" className="text-[17px] font-bold">Receipts you added</h2>
              <ul className="mt-2 space-y-2.5">
                {receipts.map((r) => {
                  const n = itemsOf(fridge, r.id).length;
                  return (
                    <li key={r.id} className="card flex items-center gap-3 bg-sheet p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold">{r.store} · {r.date}</p>
                        <p className="text-[12.5px] text-muted-foreground">{n} {n === 1 ? "item" : "items"} in your fridge · {eur(r.total)}</p>
                      </div>
                      {confirmId === r.id ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="secondary" onClick={() => setConfirmId(null)}>Keep</Button>
                          <Button onClick={() => {
                            const res = removeReceipt({ fridge, receipts }, r.id);
                            set({ fridge: res.fridge, receipts: res.receipts });
                            setConfirmId(null);
                            const removed = res.removed;
                            toast(`Receipt removed, ${removed?.items.length ?? 0} items taken off your fridge.`, removed ? {
                              action: { label: "Undo", onClick: () => { const cur = useApp.getState(); const back = restoreReceipt({ fridge: cur.fridge, receipts: cur.receipts }, removed); useApp.setState({ fridge: back.fridge, receipts: back.receipts }); } },
                            } : {});
                          }}>Remove</Button>
                        </div>
                      ) : (
                        <button type="button" aria-label={`Remove receipt from ${r.store} on ${r.date}`} onClick={() => setConfirmId(r.id)}
                          className="flex size-11 shrink-0 items-center justify-center rounded-ctl text-muted-foreground hover:bg-sheet-2 hover:text-tomato">
                          <Trash2 className="size-4" strokeWidth={1.6} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          </>
        }
      />
    </>
  );
}
