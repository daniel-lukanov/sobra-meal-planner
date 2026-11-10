import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { cookIngredients, fastSteps, prepLanes, relaxedSteps, type Block } from "@/data/cook";
import { Button, PageHeader, TwoCol, UnderlineTabs } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cook")({
  head: pageHead("Cook", "Step by step cook mode with timers, plus your Sunday prep timeline."),
  component: Cook,
});

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.start(t); o.stop(t + 0.65);
    });
  } catch { /* no audio */ }
}

function Cook() {
  const [pace, setPace] = useState<"relaxed" | "fast">("relaxed");
  const steps = pace === "relaxed" ? relaxedSteps : fastSteps;
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const [left, setLeft] = useState(step.timer ?? 0);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();
  const { fridge, set } = useApp();
  const touchX = useRef<number | null>(null);

  useEffect(() => { setI(0); }, [pace]);
  useEffect(() => { setLeft(step.timer ?? 0); setRunning(false); }, [step]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => {
      if (l <= 1) { setRunning(false); chime(); toast("Timer done."); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, []);

  const last = i >= steps.length - 1;
  const next = () => {
    if (!last) return setI(i + 1);
    const drop = ["spinach", "chicken", "rice"];
    set({ fridge: fridge.filter((f) => !drop.includes(f.id)) });
    navigate({ to: "/fridge" });
    toast("Rice, chicken and spinach taken off your fridge.");
  };
  const prev = () => setI(Math.max(0, i - 1));
  const speak = () => {
    if (!("speechSynthesis" in window)) { toast("Reading aloud is not available in this browser."); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(step.text + (step.meanwhile ? ` ${step.meanwhile}` : ""));
    u.lang = "en-GB";
    speechSynthesis.speak(u);
  };

  return (
    <>
      <PageHeader small={pace === "relaxed" ? "Tonight · 22 min" : "Tonight · 8 min"} title="Chicken and spinach rice"
        right={<UnderlineTabs label="Cooking pace" value={pace} onChange={setPace} options={[{ value: "relaxed", label: "Relaxed" }, { value: "fast", label: "Fast" }]} />} />
      <TwoCol
        main={
          <section aria-label="Cook mode"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx < -60 && !last) setI(i + 1);
              if (dx > 60) prev();
              touchX.current = null;
            }}>
            <div className="flex gap-1.5" aria-hidden>
              {steps.map((_, k) => <span key={k} className={cn("h-1 flex-1 rounded-full transition-colors duration-200", k <= i ? "bg-basil" : "bg-rule")} />)}
            </div>
            <p className="num mt-5 text-[13px] font-medium text-muted-foreground" aria-live="polite">Step {i + 1} of {steps.length}</p>
            <p key={`${pace}${i}`} className="fade-route mt-2 max-w-[22ch] text-[26px] font-semibold leading-snug tracking-[-0.02em] md:text-[30px]">{step.text}</p>

            {step.timer && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <span className="num text-[52px] font-bold leading-none text-basil" role="timer" aria-label={`${fmt(left)} remaining`}>{fmt(left)}</span>
                <Button variant="secondary" onClick={() => { if (left === 0) setLeft(step.timer!); setRunning(!running); }}>{running ? "Pause timer" : "Start timer"}</Button>
              </div>
            )}
            {step.meanwhile && (
              <p className="mt-6 border-l-2 border-mustard pl-3 text-[15px]"><span className="font-semibold text-[var(--mustard-ink)]">Meanwhile</span> · {step.meanwhile.replace(/^Meanwhile, /, "").replace(/^./, (c) => c.toUpperCase())}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={prev} disabled={i === 0}>Previous step</Button>
              <Button onClick={next}>{last ? "Finish cooking" : "Next step"}</Button>
              <Button variant="quiet" onClick={speak}>Read step aloud</Button>
            </div>
          </section>
        }
        side={
          <section aria-labelledby="ing">
            <h2 id="ing" className="text-[18px]">Ingredients</h2>
            <ul className="mt-3 divide-y divide-rule">
              {cookIngredients.map((g) => (
                <li key={g.name} className="flex justify-between gap-3 py-2.5">
                  <span><span className="font-medium">{g.name}</span> <span className="num text-muted-foreground">{g.qty}</span></span>
                  <span className={cn("text-right text-[13px]", g.note === "expires tomorrow" ? "text-tomato" : "text-muted-foreground")}>{g.note}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-muted-foreground">When you finish, these come off your fridge list.</p>
          </section>
        }
      />
      <PrepTimeline />
    </>
  );
}

const tone: Record<Block["tone"], string> = {
  basil: "bg-basil text-basil-ink",
  ink: "bg-ink text-sheet",
  mustard: "bg-mustard-tint text-ink ring-1 ring-inset ring-mustard",
};

function PrepTimeline() {
  const [sel, setSel] = useState<Block | null>(null);
  const total = 45;
  return (
    <section id="prep" aria-labelledby="pt" className="mt-10 scroll-mt-6 border-t border-rule pt-7">
      <p className="text-[13px] font-medium text-muted-foreground">Sunday · prep session 1</p>
      <h2 id="pt" className="mt-1 text-[22px]">45 minutes, three things at once</h2>
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          <div className="relative ml-16 h-5 text-[12px] text-muted-foreground num">
            {[0, 15, 30, 45].map((m) => <span key={m} className="absolute -translate-x-1/2" style={{ left: `${(m / total) * 100}%` }}>{m} min</span>)}
          </div>
          {prepLanes.map((l) => (
            <div key={l.lane} className="flex items-center border-t border-rule py-2">
              <span className="w-16 shrink-0 text-[13px] font-medium">{l.lane}</span>
              <div className="relative h-12 flex-1">
                {[15, 30].map((m) => <span key={m} aria-hidden className="absolute inset-y-0 w-px bg-rule" style={{ left: `${(m / total) * 100}%` }} />)}
                {l.blocks.map((b) => (
                  <button key={b.label} type="button" aria-pressed={sel === b} onClick={() => setSel(sel === b ? null : b)}
                    className={cn("press absolute inset-y-1 overflow-hidden rounded-chip px-2 text-left text-[12.5px] font-medium leading-tight", tone[b.tone], sel === b && "outline-2 outline-offset-2 outline-basil")}
                    style={{ left: `${(b.start / total) * 100}%`, width: `calc(${((b.end - b.start) / total) * 100}% - 3px)` }}
                    title={b.label}>
                    <span className="line-clamp-2">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 min-h-6 text-[14px]" aria-live="polite">
        {sel ? <><span className="num font-semibold">{sel.start} to {sel.end} min</span> · {sel.label}. <span className="text-muted-foreground">{sel.detail}</span></>
          : <span className="text-muted-foreground">Tap a block to see what to do.</span>}
      </p>
    </section>
  );
}
