import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { dailyPicks, weekPlan, weekSummary, type DayRow, type PrepRow } from "@/data/plan";
import { ingredientColors, type IngredientId } from "@/data/ingredients";
import { Button, Chip, Dot, PageHeader, Tape, TwoCol, UnderlineTabs } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: pageHead("Meal plan", "A week of dinners for one, built from this week's deals."),
  component: Plan,
});

function Plan() {
  const { store, mode, set } = useApp();
  return (
    <>
      <PageHeader
        small={`Week 46 · ${store}`}
        title="Meal plan for one, built from this week's deals"
        sub="Cook twice a week and eat something different every day, or decide on the day. Both modes use what is already in your fridge."
        right={<UnderlineTabs label="Planning mode" value={mode} onChange={(m) => set({ mode: m })} options={[{ value: "prep", label: "Weekly prep" }, { value: "daily", label: "Daily pick" }]} />}
      />
      {mode === "prep" ? <WeeklyPrep /> : <DailyPick />}
    </>
  );
}

function PrepItem({ row }: { row: PrepRow }) {
  const navigate = useNavigate();
  return (
    <li className="py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
        <div className="w-14 pt-0.5"><Tape basil>{row.day}</Tape></div>
        <div className="min-w-0 flex-1 rounded-block bg-basil-tint p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15.5px]">{row.title}</h3>
              <p className="text-[13px] text-muted-foreground">{row.meta}</p>
            </div>
            {row.day === "Sun" && <Button variant="primary" onClick={() => navigate({ to: "/cook", hash: "prep" })}>Open prep plan</Button>}
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Ingredients">
            {row.tags.map((t) => <li key={t} className="num rounded-chip bg-sheet px-2 py-1 text-[13px]">{t}</li>)}
          </ul>
        </div>
      </div>
      {row.note && <p className="mt-3 text-[13px] text-muted-foreground sm:pl-[76px]">{row.note}</p>}
    </li>
  );
}

function WeeklyPrep() {
  const { swaps, set, weekAccepted, addSavings, reelAdded } = useApp();
  const navigate = useNavigate();
  const [hover, setHover] = useState<IngredientId | null>(null);
  const [reel, setReel] = useState("instagram.com/reel/tuscan-chicken");
  const [checked, setChecked] = useState(false);
  let dayIdx = 0;

  return (
    <TwoCol
      main={
        <ul className="divide-y divide-rule" onMouseLeave={() => setHover(null)}>
          {weekPlan.map((row, i) => {
            if (row.kind === "prep") return <PrepItem key={i} row={row} />;
            const alt = dayIdx++ % 2 === 1;
            const r = row as DayRow;
            const meal = r.options[(swaps[i] ?? 0) % r.options.length];
            const finalMeal = reelAdded && r.day === "Sat" ? { title: "Tuscan chicken", how: "From your reel, creamy garlic sauce, 20 min", uses: ["chicken", "spinach", "onion", "rice"] as IngredientId[], price: 2.6 } : meal;
            const lit = hover && finalMeal.uses.includes(hover);
            return (
              <li key={i} className={cn("-mx-3 rounded-block px-3 py-4 transition-[background-color,opacity] duration-200 ease-kitchen", lit && "bg-sheet-2", hover && !lit && "opacity-45")}>
                <div className="flex items-start gap-5">
                  <div className="w-14 pt-0.5"><Tape alt={alt}>{r.day}</Tape></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15.5px]">{finalMeal.title}</h3>
                    <p className="text-[13px] text-muted-foreground">{finalMeal.how}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-muted-foreground">
                      <span className="mr-1">Uses</span>
                      {finalMeal.uses.map((u) => (
                        <button key={u} type="button" onMouseEnter={() => setHover(u)} onFocus={() => setHover(u)} onBlur={() => setHover(null)}
                          aria-label={`${u}, highlight every day that uses it`} aria-pressed={hover === u}
                          className="flex min-h-8 items-center gap-1.5 rounded-chip px-1.5 hover:bg-sheet">
                          <Dot color={ingredientColors[u]} className={cn("transition-transform duration-200", hover === u && "scale-150")} />{u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="num text-[15.5px] font-semibold">{eur(finalMeal.price)}</span>
                    <span className="text-[12px] text-muted-foreground">per portion</span>
                    <button type="button" className="min-h-11 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
                      onClick={() => {
                        set({ swaps: { ...swaps, [i]: (swaps[i] ?? 0) + 1 }, ...(r.day === "Sat" ? { reelAdded: false } : {}) });
                        const base = meal.uses[0];
                        toast(base === "potatoes" ? "Swapped. The plan still uses all 1.5 kg of potatoes." : `Swapped. The plan still uses the same ${base}.`);
                      }}>Swap</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      }
      side={
        <div className="space-y-8">
          <section aria-labelledby="tw">
            <h2 id="tw" className="text-[18px]">This week</h2>
            <dl className="num mt-3 space-y-2 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted-foreground">Dinners</dt><dd>{weekSummary.dinners}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{eur(weekSummary.total)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Cooking time</dt><dd className="text-right">{weekSummary.time}</dd></div>
              <div className="flex justify-between"><dt className="text-basil">Below regular prices</dt><dd className="font-semibold text-basil">{eur(weekSummary.belowRegular)}</dd></div>
            </dl>
            <div className="mt-5 flex flex-col gap-2">
              <Button disabled={weekAccepted} onClick={() => { set({ weekAccepted: true }); addSavings(weekSummary.belowRegular); toast("Week accepted. Shopping list ready."); }}>
                {weekAccepted ? "Week accepted" : "Accept this week"}
              </Button>
              <Button variant="secondary" onClick={() => navigate({ to: "/list" })}>See shopping list</Button>
            </div>
          </section>
          <section aria-labelledby="reel" className="border-t border-rule pt-6">
            <h2 id="reel" className="text-[18px]">Add a recipe from a reel</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Paste an Instagram or TikTok link. We check how much it shares with your week.</p>
            <label htmlFor="reel-url" className="sr-only">Reel link</label>
            <div className="mt-3 flex gap-2">
              <input id="reel-url" value={reel} onChange={(e) => { setReel(e.target.value); setChecked(false); }}
                className="min-h-11 min-w-0 flex-1 rounded-ctl bg-sheet-2 px-3 text-[14px]" />
              <Button variant="secondary" onClick={() => setChecked(true)}>Check fit</Button>
            </div>
            {checked && (
              <div className="slide-in mt-4 border-l-2 border-mustard pl-3">
                <p className="text-[14px]">4 of 6 ingredients already in your week (chicken, spinach, onion, rice). Adds €1.40 for cream and garlic.</p>
                <Button variant="secondary" className="mt-3" disabled={reelAdded} onClick={() => { set({ reelAdded: true }); toast("Tuscan chicken added to Saturday."); }}>
                  {reelAdded ? "Added to Saturday" : "Add to Saturday instead"}
                </Button>
              </div>
            )}
          </section>
        </div>
      }
    />
  );
}

function DailyPick() {
  const { pick, set, store, addSavings } = useApp();
  const navigate = useNavigate();
  const sel = dailyPicks.find((p) => p.id === pick) ?? dailyPicks[0];
  return (
    <div>
      <h2 className="mb-4 text-[18px]">Tonight, pick one</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {dailyPicks.map((p) => {
          const on = p.id === sel.id;
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => set({ pick: p.id })}
              className="group text-left transition-transform duration-200 ease-kitchen hover:-translate-y-0.5">
              <div className={cn("aspect-[4/3] overflow-hidden rounded-photo bg-sheet-2 outline-offset-[3px]", on ? "outline-2 outline-basil" : "outline-0")}>
                <img src={p.image} alt={p.alt} width={1024} height={768} loading="lazy" className="size-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              </div>
              <h3 className="mt-3 text-[15.5px]">{p.title}</h3>
              <p className="num text-[13px] text-muted-foreground">{p.minutes} min · {eur(p.price)} per portion</p>
              <Chip tone={p.tone} className="mt-2">{p.reason}</Chip>
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex flex-col gap-4 border-t border-rule pt-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-[15.5px]">{sel.title}</h3>
          <p className="text-[14px] text-muted-foreground">{sel.summary} {store}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { addSavings(1.1); toast("Saving €1.10 tonight compared with regular prices."); navigate({ to: "/cook" }); }}>Start cooking</Button>
          <Button variant="secondary" onClick={() => toast("Coming later: order through a delivery app for tonight.")}>Order instead tonight</Button>
        </div>
      </div>
    </div>
  );
}
