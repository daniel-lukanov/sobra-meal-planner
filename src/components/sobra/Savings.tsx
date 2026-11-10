import { useEffect, useRef, useState } from "react";
import { eur, useApp } from "@/lib/store";

function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const [bumped, setBumped] = useState(0);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (target === from) return;
    if (target > from) setBumped((b) => b + 1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(target); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      setV(from + (target - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return { v, bumped };
}

export function SavingsCounter() {
  const week = useApp((s) => s.savingsWeek);
  const month = useApp((s) => s.savingsMonth);
  const { v, bumped } = useCountUp(week);
  const goal = 30;
  const r = 16, c = 2 * Math.PI * r;
  const pct = Math.min(1, week / goal);
  return (
    <div className="flex items-center gap-3" title="Compared with the cheapest regular price of each product">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="-rotate-90 shrink-0">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--rule)" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--basil)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-500 ease-kitchen" />
      </svg>
      <div aria-live="polite">
        <div key={bumped} className={bumped ? "bump -mx-1 rounded-chip px-1" : "-mx-1 px-1"}>
          <span className="num text-[22px] font-bold leading-none text-basil">{eur(v)}</span>
        </div>
        <p className="num mt-0.5 text-[12px] text-muted-foreground">saved this week · {eur(month)} this month</p>
        <p className="sr-only">Goal {eur(goal)} per week. Compared with the cheapest regular price of each product.</p>
      </div>
    </div>
  );
}
