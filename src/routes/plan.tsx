import { useExp } from "@/lib/experiment";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { dailyPicks, weekPlan, weekSummary, type DayRow, type Meal, type PrepRow } from "@/data/plan";
import { mealPhoto, photo } from "@/data/photos";
import { Clock, Link2, RefreshCw } from "lucide-react";
import type { IngredientId } from "@/data/ingredients";
import { Button, Tape, UnderlineTabs } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: pageHead("Meal plan", "A week of dinners built from this week's real supermarket deals.", true),
  component: Plan,
});

const headline = {
  F1_money_saver: "Eat well for €1.97 a portion, built from this week's real deals",
  F2_time_mental_load: "Cook twice this week, eat a different dinner every night",
} as const;

function Plan() {
  const { store, mode, set } = useApp();
  const framing = useExp((s) => s.session?.ab_framing_variant) ?? "F2_time_mental_load";
  return (
    <>
      <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="max-w-[640px]">
          <p className="text-[13px] font-medium text-muted-foreground">Week 46 · {store}</p>
          <h1 className="mt-1 text-[28px] font-bold md:text-[32px]">{headline[framing]}</h1>
        </div>
        <div data-tour="2" data-tour-trigger data-tour-auto><UnderlineTabs label="Planning mode" value={mode}
          onChange={(m) => { if (m !== mode) { useExp.getState().track("initial_mode_switched"); useExp.getState().track("task_2_mode"); } set({ mode: m }); }}
          options={[{ value: "prep", label: "Weekly prep" }, { value: "daily", label: "Daily pick" }]} /></div>
      </header>
      <WeekBanner />
      {mode === "prep" ? <WeeklyPrep /> : <DailyPick />}
    </>
  );
}

function WeekBanner() {
  const { weekAccepted, set, addSavings } = useApp();
  const navigate = useNavigate();
  return (
    <section aria-label="This week" data-tour="2" className="mb-8 flex flex-col gap-5 border-y border-rule py-5 md:flex-row md:items-center md:justify-between">
      <dl className="num grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        {[["Dinners", String(weekSummary.dinners)], ["Total", eur(weekSummary.total)], ["Prep time", "70 min"], ["You save", eur(weekSummary.belowRegular)]].map(([k, v], i) => (
          <div key={k}>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{k}</dt>
            <dd className={cn("mt-1 font-serif text-[24px] font-extrabold leading-none", i === 3 ? "text-basil" : "text-ink")}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => navigate({ to: "/list" })} className="press min-h-11 rounded-[8px] px-4 font-semibold text-ink hover:bg-sheet-2">Shopping list (8)</button>
        <button type="button" data-tour-trigger disabled={weekAccepted} className="press min-h-11 rounded-[8px] bg-basil px-5 font-semibold text-basil-ink hover:bg-basil-700 disabled:opacity-40"
          onClick={() => { const e = useExp.getState(); e.track("accepted_week_clicked"); e.track("task_1_plan"); set({ weekAccepted: true }); addSavings(weekSummary.belowRegular); toast("Week accepted. Shopping list ready."); }}>
          {weekAccepted ? "Week accepted" : "Accept this week"}
        </button>
      </div>
    </section>
  );
}

const ingName: Record<IngredientId, string> = {
  potatoes: "Potatoes", chicken: "Chicken", onion: "Onion", carrots: "Carrots", eggs: "Eggs",
  rice: "Rice", chickpeas: "Chickpeas", peppers: "Peppers", tuna: "Tuna", spinach: "Spinach",
};
const bases: { id: IngredientId | null; label: string }[] = [
  { id: null, label: "All bases" },
  { id: "potatoes", label: "1.5 kg Potatoes (Mon–Wed)" },
  { id: "chicken", label: "1 kg Chicken" },
  { id: "rice", label: "600 g Rice (Thu–Fri)" },
  { id: "peppers", label: "Roast Peppers (Fri–Sat)" },
];
const prepNote: Partial<Record<IngredientId, string>> = {
  potatoes: "Sunday prepped potatoes", chicken: "Sunday roast chicken", rice: "Wednesday cooked rice", peppers: "Wednesday roast peppers",
};
const prepCopy: Record<string, { tape: string; text: string }> = {
  Sun: { tape: "Sun · Prep 1", text: "45 min · Boil 1.5 kg potatoes, roast 1 kg chicken, chop onions & carrots once" },
  Wed: { tape: "Wed · Prep 2", text: "25 min · Cook 600 g rice, roast 3 peppers, chickpea base" },
};

function PrepBanner({ row }: { row: PrepRow }) {
  const navigate = useNavigate();
  const c = prepCopy[row.day]!;
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-l-[3px] border-basil pl-4">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-basil">{c.tape}</p>
        <p className="mt-1 text-[15px] font-medium text-ink">{c.text}</p>
      </div>
      <Button variant="quiet" className="text-basil underline underline-offset-4" onClick={() => navigate({ to: "/cook", hash: "prep" })}>Open prep timeline</Button>
    </div>
  );
}

type Card = { i: number; day: string; meal: Meal; base: Meal };

function WeeklyPrep() {
  const { swaps, set, reelAdded } = useApp();
  const [filter, setFilter] = useState<IngredientId | null>(null);
  const [reel, setReel] = useState("instagram.com/reel/tuscan-chicken");
  const [checked, setChecked] = useState(false);

  const chapters: { prep: PrepRow; days: Card[] }[] = [];
  weekPlan.forEach((row, i) => {
    if (row.kind === "prep") { chapters.push({ prep: row as PrepRow, days: [] }); return; }
    const r = row as DayRow;
    const base = r.options[(swaps[i] ?? 0) % r.options.length]!;
    const meal: Meal = reelAdded && r.day === "Sat" ? { title: "Tuscan chicken", how: "From your reel · creamy garlic sauce, 20 min", uses: ["chicken", "spinach", "onion", "rice"], price: 2.6 } : base;
    chapters.at(-1)!.days.push({ i, day: r.day, meal, base });
  });

  return (
    <div>
      <div role="group" aria-label="Filter by prepped base" data-tour="1" data-tour-auto className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-rule">
        {bases.map((b) => {
          const on = filter === b.id;
          return (
            <button key={b.label} type="button" aria-pressed={on}
              onClick={() => { setFilter(b.id); if (b.id) { useExp.getState().track("synergy_filter_used"); useExp.getState().track("task_1_plan"); } }}
              className={cn("-mb-px min-h-11 border-b-2 text-[14px] font-semibold transition-colors", on ? "border-basil text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>
              {b.label}
            </button>
          );
        })}
      </div>

      {chapters.map((ch, ci) => (
        <section key={ci} aria-label={prepCopy[ch.prep.day]!.tape}>
          <PrepBanner row={ch.prep} />
          <ul className={cn("grid grid-cols-1 gap-5 md:grid-cols-3", ci === 0 ? "mb-10" : "mb-8")}>
            {ch.days.map(({ i, day, meal, base }, k) => {
              const lit = !!filter && meal.uses.includes(filter);
              return (
                <li key={i} className={cn("flex flex-col overflow-hidden rounded-sheet bg-sheet transition-all duration-200", lit && "border-tomato", filter && !lit && "opacity-50")}>
                  <div className="relative h-48 bg-sheet-2">
                    <img src={mealPhoto[meal.title] ?? photo.prep} alt={meal.title} width={600} height={384} loading="lazy" className="size-full object-cover" />
                    <div className="absolute left-3 top-3"><Tape alt={k % 2 === 1}>{day}</Tape></div>
                    <span className="num absolute right-3 top-3 rounded-[6px] bg-sheet px-2.5 py-1 text-[15px] font-bold">{eur(meal.price)}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-[19px] font-bold">{meal.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground"><Clock className="size-3.5" aria-hidden />{meal.how}</p>
                    {lit && filter && prepNote[filter] && (
                      <p className="slide-in mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-tomato"><Link2 className="size-3.5" aria-hidden />Uses {prepNote[filter]}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-rule pt-3 mt-4">
                      <p className="min-w-0 text-[13px] text-muted-foreground">Reuses:{" "}
                        {meal.uses.map((u, j) => <span key={u} className={cn(filter === u ? "font-semibold text-tomato" : "text-ink")}>{ingName[u]}{j < meal.uses.length - 1 ? ", " : ""}</span>)}
                      </p>
                      <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[13.5px]"
                        onClick={() => {
                          useExp.getState().track("swapped_meal_clicked");
                          set({ swaps: { ...swaps, [i]: (swaps[i] ?? 0) + 1 }, ...(day === "Sat" ? { reelAdded: false } : {}) });
                          const b = base.uses[0];
                          toast(b === "potatoes" ? "Swapped. The plan still uses all 1.5 kg of potatoes." : `Swapped. The plan still uses the same ${b}.`);
                        }}><RefreshCw className="size-3.5" strokeWidth={1.8} aria-hidden />Swap</Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section aria-labelledby="reel" className="flex flex-col gap-4 rounded-sheet bg-sheet p-5 md:flex-row md:items-center">
        <div className="md:w-[40%]">
          <h2 id="reel" className="text-[18px]">Add a recipe from an Instagram or TikTok reel</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Paste the link. We check how much it shares with your week.</p>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="reel-url" className="sr-only">Reel link</label>
          <div className="flex gap-2">
            <input id="reel-url" value={reel} onChange={(e) => { setReel(e.target.value); setChecked(false); }} className="min-h-11 min-w-0 flex-1 rounded-ctl bg-sheet-2 px-3 text-[14px]" />
            <Button variant="secondary" onClick={() => setChecked(true)}>Check fit</Button>
          </div>
          {checked && (
            <div className="slide-in mt-3 flex flex-wrap items-center gap-3">
              <p className="text-[14px]">4 of 6 ingredients already in your week. Adds €1.40 for cream and garlic.</p>
              <Button variant="secondary" disabled={reelAdded} onClick={() => { set({ reelAdded: true }); toast("Tuscan chicken added to Saturday."); }}>
                {reelAdded ? "Added to Saturday" : "Add to Saturday instead"}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const reasons: Record<string, string> = { rice: "Uses spinach expiring tomorrow", curry: "Chickpeas on deal", pasta: "Fastest tonight · 15 min" };
const reasonTone: Record<string, string> = { rice: "bg-tomato-tint text-tomato", curry: "bg-mustard-tint text-mustard-ink", pasta: "bg-basil-tint text-basil" };

function DailyPick() {
  const { pick, set, store, addSavings } = useApp();
  const navigate = useNavigate();
  const sel = dailyPicks.find((p) => p.id === pick) ?? dailyPicks[0]!;
  return (
    <div>
      <h2 className="mb-4 text-[20px]">Tonight, pick one</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {dailyPicks.map((p) => {
          const on = p.id === sel.id;
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => set({ pick: p.id })}
              className={cn("group flex flex-col overflow-hidden rounded-sheet border-2 border-transparent bg-sheet text-left transition-all duration-200", on ? "border-basil" : "border-transparent")}>
              <div className="h-52 overflow-hidden bg-sheet-2">
                <img src={p.image} alt={p.alt} width={600} height={416} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
              <div className="p-4">
                <h3 className="text-[19px] font-bold">{p.title}</h3>
                <p className="num text-[13px] text-muted-foreground">{p.minutes} min · {eur(p.price)} per portion</p>
                <span className={cn("mt-3 inline-flex rounded-[6px] px-2.5 py-1 text-[12.5px] font-semibold", reasonTone[p.id])}>{reasons[p.id] ?? p.reason}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-col gap-4 rounded-sheet bg-sheet p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-[19px] font-bold">{sel.title}</h3>
          <p className="text-[14px] text-muted-foreground">{sel.summary} {store}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { const e = useExp.getState(); e.track("accepted_week_clicked"); e.track("task_1_plan"); addSavings(1.1); toast("Saving €1.10 tonight compared with regular prices."); navigate({ to: "/cook" }); }}>Start cooking</Button>
          <Button variant="secondary" onClick={() => toast("Coming later: order through a delivery app for tonight.")}>Order instead tonight</Button>
        </div>
      </div>
    </div>
  );
}
