// The two actions Home is built on, as hooks that bring their own pop-overs:
//  - useCookFlow: start cooking a dinner; offers to move it to today, then makes the person resolve missing ingredients first.
//  - usePlaceFlow: put a dinner on the plan; a free day, or a chosen dinner to replace after a confirmation.
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { useWeek } from "@/lib/use-week";
import { REMOVED, weekSlots } from "@/lib/week";
import type { Meal } from "@/data/plan";
import { Button } from "./ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const todayName = () => WEEKDAYS[new Date().getDay()]!;
export const todayDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const labelOf = (slug: string, names?: Record<string, string>) => names?.[slug] ?? (slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "));

/** True when the person has this base ingredient: in the fridge, said "I have it", or ticked it off the shopping list. */
export function useCovered() {
  const { fridge, have, checked } = useApp();
  const ids = [...fridge.map((f) => (f.id === "onions" ? "onion" : f.id)), ...have, ...Object.keys(checked).filter((k) => checked[k])];
  return (u: string) => ids.some((id) => id === u || id.startsWith(`${u}-`));
}

/** Tonight's dinner in Daily pick, or null when nothing is picked for today. */
export function useTonight(): Meal | null {
  const today = useApp((s) => s.today);
  const { ctx } = useWeek();
  if (!today || today.date !== todayDate()) return null;
  return ctx.pool.find((m) => m.title === today.title) ?? null;
}

function Pop({ open, onClose, title, sub, children, footer }: { open: boolean; onClose: () => void; title: string; sub?: string; children?: ReactNode; footer: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {sub && <DialogDescription>{sub}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CookStep = { meal: Meal; from?: number; stage: "move" | "gaps" };

export function useCookFlow() {
  const navigate = useNavigate();
  const { chosen, set, have, mode } = useApp();
  const { ctx } = useWeek();
  const covered = useCovered();
  const [step, setStep] = useState<CookStep | null>(null);
  const slots = weekSlots(chosen, ctx);
  const todaySlot = slots.find((s) => s.day === todayName());
  const missingOf = (m: Meal) => m.uses.filter((u) => !covered(u));
  const go = (m: Meal) => { setStep(null); if (m.slug) navigate({ to: "/cook", search: { recipe: m.slug } }); };
  const check = (m: Meal, from?: number) => (missingOf(m).length ? setStep({ meal: m, ...(from !== undefined ? { from } : {}), stage: "gaps" }) : go(m));

  /** Start cooking `meal`; `from` is its day row when it comes from the week. */
  const start = (meal: Meal, from?: number) => {
    if (mode === "prep" && from !== undefined && todaySlot && todaySlot.i !== from) { setStep({ meal, from, stage: "move" }); return; }
    check(meal, from);
  };
  const swapWithToday = () => {
    if (!step || step.from === undefined || !todaySlot) return;
    const fromSlot = slots.find((s) => s.i === step.from)!;
    set({ chosen: { ...chosen, [todaySlot.i]: step.meal.title, [step.from]: todaySlot.meal?.title ?? REMOVED }, weekAccepted: false });
    toast(todaySlot.meal ? `${step.meal.title} is today now, ${todaySlot.meal.title} moved to ${fromSlot.day}.` : `${step.meal.title} is today now.`);
    check(step.meal, todaySlot.i);
  };

  const missing = step ? missingOf(step.meal) : [];
  const fromDay = step?.from !== undefined ? slots.find((s) => s.i === step.from)?.day : undefined;
  const dialogs = (
    <>
      <Pop open={step?.stage === "move"} onClose={() => setStep(null)}
        title={`Cook ${fromDay}'s dinner today?`}
        sub={todaySlot?.meal ? `${step?.meal.title} moves to today, and today's ${todaySlot.meal.title} moves to ${fromDay}. Your shopping list stays the same.` : `${step?.meal.title} moves to today.`}
        footer={<>
          <Button variant="quiet" onClick={() => setStep(null)}>Cancel</Button>
          <Button variant="secondary" onClick={() => step && check(step.meal, step.from)}>Keep the order</Button>
          <Button onClick={swapWithToday}>Swap the days</Button>
        </>} />
      <Pop open={step?.stage === "gaps"} onClose={() => setStep(null)}
        title={missing.length ? `You may be missing ${missing.length === 1 ? "1 ingredient" : `${missing.length} ingredients`}` : "You have everything"}
        sub={missing.length ? `${step?.meal.title} needs these, and we can't see them in your fridge. Mark what you have, or pick another dinner.` : "Ready when you are."}
        footer={<>
          <Button variant="secondary" onClick={() => setStep(null)}>Pick another dinner</Button>
          <Button disabled={missing.length > 0} onClick={() => step && go(step.meal)}>Start cooking</Button>
        </>}>
        {missing.length > 0 && (
          <ul className="divide-y divide-rule">
            {missing.map((u) => (
              <li key={u} className="flex items-center justify-between gap-3 py-2">
                <span className="text-[15px]">{labelOf(u, step?.meal.names)}</span>
                <Button variant="secondary" className="min-h-9 px-3 text-[13.5px]" onClick={() => set({ have: [...new Set([...have, u])] })}>I have it</Button>
              </li>
            ))}
          </ul>
        )}
      </Pop>
    </>
  );
  return { start, dialogs };
}

type PlaceStep = { meal: Meal; stage: "free" | "replace" | "confirm" | "tonight"; target?: number };

export function usePlaceFlow() {
  const { chosen, set, mode } = useApp();
  const { ctx } = useWeek();
  const tonight = useTonight();
  const [step, setStep] = useState<PlaceStep | null>(null);
  const slots = weekSlots(chosen, ctx);
  const free = slots.filter((s) => !s.meal);
  const placeAt = (meal: Meal, i: number) => {
    const day = slots.find((s) => s.i === i)?.day;
    set({ chosen: { ...chosen, [i]: meal.title }, weekAccepted: false });
    setStep(null);
    toast(`${meal.title} added for ${day}.`);
  };
  const setTonight = (meal: Meal) => { set({ today: { date: todayDate(), title: meal.title } }); setStep(null); toast(`${meal.title} is tonight's dinner.`); };

  const add = (meal: Meal) => {
    if (mode === "daily") { if (tonight && tonight.title !== meal.title) setStep({ meal, stage: "tonight" }); else setTonight(meal); return; }
    const there = slots.find((s) => s.meal?.title === meal.title);
    if (there) { toast(`${meal.title} is already on ${there.day}.`); return; }
    if (slots.length === 0) { toast("Your week has no days yet. Check your settings."); return; }
    if (free.length === 1) placeAt(meal, free[0]!.i);
    else setStep({ meal, stage: free.length ? "free" : "replace" });
  };
  const target = step?.target !== undefined ? slots.find((s) => s.i === step.target) : undefined;
  const dayButton = (label: ReactNode, onClick: () => void, key: number) => (
    <li key={key}><button type="button" onClick={onClick} className="press flex min-h-11 w-full items-center justify-between gap-3 bg-sheet-2 px-3 text-left text-[14px] hover:bg-sheet-hover">{label}</button></li>
  );
  const dialogs = (
    <>
      <Pop open={step?.stage === "free"} onClose={() => setStep(null)} title={`Which day for ${step?.meal.title}?`} sub="These days are free."
        footer={<Button variant="quiet" onClick={() => setStep(null)}>Cancel</Button>}>
        <ul className="space-y-1.5">{free.map((s) => dayButton(<span className="font-semibold">{s.day}</span>, () => step && placeAt(step.meal, s.i), s.i))}</ul>
      </Pop>
      <Pop open={step?.stage === "replace"} onClose={() => setStep(null)} title="Your week is full" sub={`Pick the dinner that ${step?.meal.title} should replace.`}
        footer={<Button variant="quiet" onClick={() => setStep(null)}>Cancel</Button>}>
        <ul className="space-y-1.5">{slots.map((s) => dayButton(<><span className="font-semibold">{s.day}</span><span className="text-muted-foreground">{s.meal?.title}</span></>, () => step && setStep({ ...step, stage: "confirm", target: s.i }), s.i))}</ul>
      </Pop>
      <Pop open={step?.stage === "confirm"} onClose={() => setStep(null)} title={`Replace ${target?.meal?.title}?`} sub={`${step?.meal.title} goes on ${target?.day} instead. Your shopping list updates.`}
        footer={<>
          <Button variant="secondary" onClick={() => step && setStep({ ...step, stage: "replace" })}>Back</Button>
          <Button onClick={() => step && step.target !== undefined && placeAt(step.meal, step.target)}>Replace</Button>
        </>} />
      <Pop open={step?.stage === "tonight"} onClose={() => setStep(null)} title={`Replace tonight's ${tonight?.title}?`} sub={`${step?.meal.title} becomes tonight's dinner.`}
        footer={<>
          <Button variant="secondary" onClick={() => setStep(null)}>Cancel</Button>
          <Button onClick={() => step && setTonight(step.meal)}>Replace</Button>
        </>} />
    </>
  );
  return { add, dialogs };
}
