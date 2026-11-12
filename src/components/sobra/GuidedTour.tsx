import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { useExp, type TourStep } from "@/lib/experiment";
import { Button } from "./ui";

const steps: Record<TourStep, { to: "/plan" | "/deals" | "/fridge" | null; text: string }> = {
  1: { to: "/plan", text: "This is your week. Switch between Weekly prep and Daily pick to compare. If you'd cook this, tap Accept this week." },
  2: { to: "/deals", text: "Every deal is checked against the regular price. Price traps are marked. Tap Add to plan on a deal you'd buy." },
  3: { to: "/fridge", text: "After shopping you could snap your receipt here and pratico fills your fridge. Try it with the sample receipt or skip." },
  4: { to: null, text: "That's the tour. Look around as long as you like. When you're done, tap Give feedback." },
};

/** Small coachmark next to the feature. No overlay and nothing is locked. */
export function GuidedTour() {
  const step = useExp((s) => s.tour);
  const { setTour, endTour } = useExp.getState();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cur = step ? steps[step] : null;

  useEffect(() => { if (cur?.to && !pathname.startsWith(cur.to)) navigate({ to: cur.to }); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!step || step === 4) { setPos(null); return; }
    let el: HTMLElement | null = null;
    const place = () => {
      el = document.querySelector<HTMLElement>(`[data-tour="${step}"]`);
      if (!el) { setPos(null); return; }
      const r = el.getBoundingClientRect();
      const w = Math.min(340, window.innerWidth - 32);
      setPos({ top: r.bottom + window.scrollY + 10, left: Math.max(16, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 16)) });
    };
    const t = setTimeout(() => { place(); el?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 250);
    window.addEventListener("resize", place);
    const ro = new ResizeObserver(place); ro.observe(document.body);
    return () => { clearTimeout(t); window.removeEventListener("resize", place); ro.disconnect(); };
  }, [step, pathname]);

  if (!step || !cur) return null;
  const next = () => (step === 4 ? endTour("completed") : setTour((step + 1) as TourStep));
  const style = pos ? { position: "absolute" as const, top: pos.top, left: pos.left } : undefined;
  return (
    <div role="dialog" aria-label={`Tour, step ${Math.min(step, 3)} of 3`} style={style}
      className={pos ? "z-30 w-[min(340px,calc(100vw-32px))] border border-ink bg-ground p-4 shadow-float" : "fixed inset-x-4 bottom-20 z-30 mx-auto max-w-sm border border-ink bg-ground p-4 shadow-float md:bottom-6"}>
      {step < 4 && <p className="eyebrow">Step {step} of 3</p>}
      <p className="mt-1 text-[14.5px]">{cur.text}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button className="min-h-10" onClick={next}>{step === 4 ? "Got it" : "Next"}</Button>
        {step < 4 && <button type="button" onClick={() => endTour("skipped")} className="min-h-10 text-[13.5px] font-medium text-muted-foreground underline underline-offset-4 hover:text-ink">Skip tour</button>}
      </div>
    </div>
  );
}
