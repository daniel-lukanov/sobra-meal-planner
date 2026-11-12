import { useEffect, useRef, useState } from "react";
import { PiggyBank } from "lucide-react";
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      setV(from + (target - from) * (1 - Math.pow(1 - k, 3)));
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
  return (
    <span key={bumped} aria-live="polite" title={`Saved this week, ${eur(month)} this month. Compared with the cheapest regular price of each product.`}
      className={`num flex shrink-0 items-center gap-2 rounded-[6px] bg-basil-tint px-3.5 py-1.5 text-sm font-bold text-basil ${bumped ? "bump" : ""}`}>
      <PiggyBank className="size-4" strokeWidth={1.8} aria-hidden />{eur(v)}<span className="hidden font-semibold sm:inline">saved</span>
    </span>
  );
}
