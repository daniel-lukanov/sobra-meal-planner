import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Hand, PartyPopper } from "lucide-react";
import { useExp } from "@/lib/experiment";
import type { TaskKey } from "@/lib/experiment-types";
import { VerdictModal } from "./VerdictModal";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5;
const steps: Record<Step, { to: "/plan" | "/deals" | "/list" | "/fridge"; task: TaskKey; title: string; guide: string; done: string; next: string }> = {
  1: { to: "/plan", task: "task_1_plan", title: "Ingredient synergy",
    guide: "Tap '1.5 kg Potatoes' or '1 kg Chicken' to see how one Sunday prep turns into 3 different dinners.",
    done: "Synergy filter tested. Try swapping a meal or testing the Reel importer, then click Next.", next: "Next: Step 2 of 5" },
  2: { to: "/plan", task: "task_2_mode", title: "Mode switch and accept week",
    guide: "Switch between 'Weekly prep' and 'Daily pick' to compare both modes, then click 'Accept this week' to add €6.85 to your savings.",
    done: "Week tested. Explore both modes freely, then head to Deals.", next: "Next: Step 3 (Supermarket Deals)" },
  3: { to: "/deals", task: "task_3_deals", title: "Honest deals and price alerts",
    guide: "See how Sobra flags fake supermarket discounts. Toggle on any Price Alert switch below to unlock this page.",
    done: "Price alert set. Browse the deals or try switching stores in the top bar, then continue.", next: "Next: Step 4 (Shopping List)" },
  4: { to: "/list", task: "task_4_list", title: "Smart aisle shopping list",
    guide: "Onions and rice are already crossed out from your fridge. Tap any unchecked item (like Potatoes or Carrots) to check it off.",
    done: "Item checked off. Explore the aisles, then head to your Smart Fridge.", next: "Next: Step 5 (Receipt Scanner)" },
  5: { to: "/fridge", task: "task_5_fridge", title: "Receipt scanner and smart fridge",
    guide: "Click 'Scan a receipt' (and 'Add 4 items to my fridge') to watch Sobra translate a Portuguese Lidl receipt with zero typing.",
    done: "", next: "" },
};

const targetsFor = (n: Step) => Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${n}"]`));
const clickable = 'button:not([disabled]):not([aria-pressed="true"]):not([aria-checked="true"]), input[type=checkbox]:not(:checked):not(:disabled)';

/** Clicks the first sensible control inside the spotlight, so stuck testers can still see the result. */
function autoDo(n: Step) {
  for (const t of targetsFor(n)) {
    const autos = t.matches("[data-tour-auto]") ? [t] : Array.from(t.querySelectorAll<HTMLElement>("[data-tour-auto]"));
    for (const a of autos) {
      const el = a.matches(clickable) ? a : a.querySelector<HTMLElement>(clickable);
      if (el) { el.click(); return true; }
    }
  }
  return false;
}

function useRects(n: Step | null) {
  const [rects, setRects] = useState<DOMRect[]>([]);
  useEffect(() => {
    if (!n) { setRects([]); return; }
    let raf = 0; let scrolled = false;
    const tick = () => {
      const els = targetsFor(n);
      if (els.length && !scrolled) { scrolled = true; els[0]!.scrollIntoView({ behavior: "smooth", block: "center" }); }
      const next = els.map((e) => e.getBoundingClientRect());
      setRects((cur) => (cur.length === next.length && cur.every((r, i) => Math.abs(r.top - next[i]!.top) < 0.5 && Math.abs(r.height - next[i]!.height) < 0.5 && Math.abs(r.left - next[i]!.left) < 0.5) ? cur : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return rects;
}

export function GuidedTour() {
  const tour = useExp((s) => s.tour);
  const session = useExp((s) => s.session);
  const setTour = useExp((s) => s.setTour);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const active = tour && tour !== "done" ? tour : null;
  const focusStep = active?.sub === "guided_focus" && pathname.startsWith(steps[active.step].to) ? active.step : null;
  const rects = useRects(focusStep);

  // The click on the spotlight itself unlocks the page.
  useEffect(() => {
    if (!focusStep) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const hit = targetsFor(focusStep).some((t) => {
        if (!t.contains(el)) return false;
        const triggers = t.matches("[data-tour-trigger]") ? [t] : Array.from(t.querySelectorAll("[data-tour-trigger]"));
        return triggers.length === 0 || triggers.some((x) => x.contains(el));
      });
      if (!hit) return;
      setTimeout(() => {
        const exp = useExp.getState();
        exp.track(steps[focusStep].task);
        if (focusStep === 2) exp.track("initial_mode_switched");
        if (focusStep === 5) { exp.track("fridge_receipt_scanned"); exp.setTour("done"); }
        else exp.setTour({ step: focusStep, sub: "step_unlocked_explore" });
      }, 0);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [focusStep]);

  if (!tour || !session) return null;

  const goStep = (n: Step) => { setTour({ step: n, sub: "guided_focus" }); navigate({ to: steps[n].to }); };
  const doForMe = () => {
    if (!active) return;
    if (!pathname.startsWith(steps[active.step].to)) { navigate({ to: steps[active.step].to }); return; }
    autoDo(active.step);
    // Some steps take two clicks (the receipt reads first, then adds).
    setTimeout(() => { const t = useExp.getState().tour; if (t && t !== "done" && t.sub === "guided_focus") autoDo(active.step); }, 1500);
  };

  const W = typeof window === "undefined" ? 0 : window.innerWidth, H = typeof window === "undefined" ? 0 : window.innerHeight;
  const pad = 8;
  const holes = rects.map((r) => `M${r.left - pad} ${r.top - pad}h${r.width + pad * 2}v${r.height + pad * 2}h${-(r.width + pad * 2)}z`).join("");

  return (
    <>
      {focusStep && rects.length > 0 && (
        <>
          <div aria-hidden className="fixed inset-0 z-[45] bg-ink/65 backdrop-blur-[2px] transition-opacity"
            style={{ clipPath: `path(evenodd, "M0 0H${W}V${H}H0z${holes}")` }} />
          {rects.map((r, i) => (
            <div key={i} aria-hidden className="pointer-events-none fixed z-[46] rounded-2xl ring-4 ring-tape shadow-[0_0_0_8px_color-mix(in_oklab,var(--tape)_30%,transparent),0_20px_50px_rgba(0,0,0,0.45)] transition-all duration-300"
              style={{ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 }} />
          ))}
          <span aria-hidden className="pointer-events-none fixed z-[47] flex animate-bounce items-center gap-1 rounded-full bg-tape px-3 py-1 text-xs font-bold text-ink shadow-md"
            style={{ left: rects[0]!.left, top: Math.max(4, rects[0]!.top - pad - 30) }}>
            <Hand className="size-3.5" aria-hidden />Tap here first
          </span>
        </>
      )}

      <div className="fixed inset-x-4 bottom-16 z-50 mx-auto max-w-3xl md:bottom-5" role="region" aria-label="Guided tour">
        {active?.sub === "guided_focus" && (
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-tape bg-ink p-4 text-sheet shadow-2xl sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-sheet/70">Step {active.step} of 5 · Guided action</p>
              <p className="font-serif text-[18px] font-bold text-tape">{steps[active.step].title}</p>
              <p className="mt-0.5 text-[14px] leading-snug text-sheet/90" aria-live="polite">{steps[active.step].guide}</p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
              <button type="button" onClick={doForMe} className="press inline-flex items-center gap-1 rounded-lg bg-sheet/15 px-3 py-2 text-xs font-semibold text-sheet hover:bg-sheet/25">
                {pathname.startsWith(steps[active.step].to) ? "Do this for me" : "Take me there"}<ArrowRight className="size-3.5" aria-hidden />
              </button>
              <button type="button" onClick={() => setTour(null)} className="text-xs text-sheet/70 underline underline-offset-4 hover:text-sheet">Unlock free roam</button>
            </div>
          </div>
        )}
        {active?.sub === "step_unlocked_explore" && (
          <Celebrate text={<><b>Step {active.step} completed.</b> {steps[active.step].done}</>}
            button={<GoldButton onClick={() => goStep((active.step + 1) as Step)}>{steps[active.step].next}</GoldButton>} />
        )}
        {tour === "done" && (
          <Celebrate icon={<PartyPopper className="size-5 shrink-0 text-tape" aria-hidden />}
            text={<><b>All 5 steps completed.</b> Explore Sobra freely (try Cook mode), then claim your reward.</>}
            button={<GoldButton onClick={() => setOpen(true)}>{session.survey_post_completed ? (session.bonus_completed ? "See my reward" : "Unlock bonus reward") : "Finish & Claim 1st Month Free (25 sec)"}</GoldButton>} />
        )}
      </div>
      <VerdictModal open={open} onOpenChange={setOpen} />
    </>
  );
}

function Celebrate({ text, button, icon }: { text: ReactNode; button: ReactNode; icon?: ReactNode }) {
  return (
    <div className="fade-route flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-tape bg-basil p-4 text-basil-ink shadow-2xl sm:flex-row">
      <p className="flex items-start gap-2 text-[14.5px] leading-snug" aria-live="polite">{icon ?? <Check className="mt-0.5 size-5 shrink-0 text-tape" strokeWidth={3} aria-hidden />}<span>{text}</span></p>
      {button}
    </div>
  );
}
function GoldButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("press inline-flex shrink-0 animate-pulse items-center gap-1.5 rounded-xl bg-tape px-5 py-2.5 font-bold text-ink shadow-md transition-transform hover:bg-sheet active:scale-95 hover:animate-none")}>
      {children}<ArrowRight className="size-4" aria-hidden />
    </button>
  );
}

