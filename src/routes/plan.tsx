import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { dailyPicks, weekPlan, weekSummary, type DayRow, type Meal, type PrepRow } from "@/data/plan";
import { mealPhoto, photo } from "@/data/photos";
import { Clock, Link2, RefreshCw } from "lucide-react";
import { ingredientColors, type IngredientId } from "@/data/ingredients";
import { Button, Chip, PageHeader, Tape, TwoCol, UnderlineTabs } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: pageHead("Meal plan", "A week of dinners for one, built from this week's deals.", true),
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
  potatoes: "Uses Sunday prepped potatoes",
  chicken: "Uses Sunday roast chicken",
  onion: "Uses Sunday chopped onions",
  carrots: "Uses Sunday chopped carrots",
  rice: "Uses Wednesday cooked rice",
  peppers: "Uses Wednesday roast peppers",
  chickpeas: "Uses Wednesday chickpea base",
};

function IngBadge({ id }: { id: IngredientId }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" fill={ingredientColors[id]} opacity=".22" />
      <circle cx="8" cy="8" r="3.6" fill={ingredientColors[id]} />
    </svg>
  );
}

function PrepItem({ row }: { row: PrepRow }) {
  const navigate = useNavigate();
  return (
    <li className="card overflow-hidden border-basil/20 bg-basil-tint p-3.5">
      <div className="grid grid-cols-[76px_1fr] items-start gap-4 sm:grid-cols-[76px_1fr_auto]">
        <div className="relative">
          <img src={photo.prep} alt="Kitchen counter with chopped vegetables ready for batch cooking" width={76} height={76} loading="lazy" className="size-[76px] rounded-[12px] bg-sheet-2 object-cover" />
          <div className="absolute -left-2 -top-3"><Tape basil>{row.day}</Tape></div>
        </div>
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold">{row.title}</h3>
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Clock className="size-3.5" aria-hidden />{row.meta}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Ingredients">
            {row.tags.map((t) => <li key={t} className="num rounded-full bg-sheet px-2.5 py-1 text-[12.5px] font-medium">{t}</li>)}
          </ul>
        </div>
        {row.day === "Sun" && <Button className="col-span-2 sm:col-span-1" onClick={() => navigate({ to: "/cook", hash: "prep" })}>Open prep plan</Button>}
      </div>
      {row.note && <p className="mt-3 text-[13px] text-muted-foreground">{row.note}</p>}
    </li>
  );
}

function WeeklyPrep() {
  const { swaps, set, weekAccepted, addSavings, reelAdded } = useApp();
  const navigate = useNavigate();
  const [hover, setHover] = useState<IngredientId | null>(null);
  const [filter, setFilter] = useState<IngredientId | null>(null);
  const [reel, setReel] = useState("instagram.com/reel/tuscan-chicken");
  const [checked, setChecked] = useState(false);
  const active = hover ?? filter;

  let dayIdx = 0;
  const rows = weekPlan.map((row, i) => {
    if (row.kind === "prep") return { i, row, meal: null, alt: false };
    const r = row as DayRow;
    const meal = r.options[(swaps[i] ?? 0) % r.options.length]!;
    const finalMeal: Meal = reelAdded && r.day === "Sat" ? { title: "Tuscan chicken", how: "From your reel, creamy garlic sauce, 20 min", uses: ["chicken", "spinach", "onion", "rice"], price: 2.6 } : meal;
    return { i, row, meal: finalMeal, base: meal, alt: dayIdx++ % 2 === 1 };
  });
  const counts: Partial<Record<IngredientId, number>> = {};
  rows.forEach((r) => r.meal?.uses.forEach((u) => { counts[u] = (counts[u] ?? 0) + 1; }));

  return (
    <TwoCol
      main={
        <div>
          <div className="mb-5">
            <p className="text-[14px] font-medium">Tap a prepped base to see how it turns into 3 different dinners:</p>
            <div role="group" aria-label="Filter by prepped base" className="mt-2.5 flex flex-wrap gap-2">
              {bases.map((b) => {
                const on = filter === b.id;
                return (
                  <button key={b.label} type="button" aria-pressed={on} onClick={() => setFilter(b.id)}
                    className={cn("press flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold", on ? "bg-ink text-sheet" : "bg-sheet-2 text-ink hover:bg-sheet-hover")}>
                    {b.id && <IngBadge id={b.id} />}{b.label}
                  </button>
                );
              })}
            </div>
          </div>
          <ul className="space-y-3" onMouseLeave={() => setHover(null)}>
            {rows.map(({ i, row, meal, base, alt }) => {
              if (row.kind === "prep" || !meal) return <PrepItem key={i} row={row as PrepRow} />;
              const r = row as DayRow;
              const lit = !!active && meal.uses.includes(active);
              const img = mealPhoto[meal.title] ?? photo.prep;
              return (
                <li key={i} className={cn("card p-3.5 transition-[box-shadow,opacity,border-color] duration-200 ease-kitchen", lit && "border-mustard shadow-[0_0_0_1px_var(--mustard)]", active && !lit && "opacity-50")}>
                  <div className="grid grid-cols-[76px_1fr] items-start gap-4 sm:grid-cols-[76px_1fr_auto]">
                    <div className="relative">
                      <img src={img} alt={meal.title} width={76} height={76} loading="lazy" className="size-[76px] rounded-[12px] bg-sheet-2 object-cover" />
                      <div className="absolute -left-2 -top-3"><Tape alt={alt}>{r.day}</Tape></div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-bold">{meal.title}</h3>
                      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Clock className="size-3.5" aria-hidden />{meal.how}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {meal.uses.map((u) => (
                          <button key={u} type="button"
                            onMouseEnter={() => setHover(u)} onFocus={() => setHover(u)} onBlur={() => setHover(null)}
                            onClick={() => setFilter(filter === u ? null : u)}
                            aria-pressed={active === u} aria-label={`${ingName[u]}, used in ${counts[u]} meals. Highlight them`}
                            className={cn("press flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium", active === u ? "bg-mustard-tint text-ink ring-1 ring-mustard" : "bg-sheet-2 hover:bg-sheet-hover")}>
                            <IngBadge id={u} />{ingName[u]} · {counts[u]} {counts[u] === 1 ? "meal" : "meals"}
                          </button>
                        ))}
                      </div>
                      {lit && active && prepNote[active] && (
                        <p className="slide-in mt-2 inline-flex items-center gap-1.5 rounded-full bg-mustard-tint px-2.5 py-1 text-[12.5px] font-semibold text-[var(--mustard-ink)]">
                          <Link2 className="size-3.5" aria-hidden />{prepNote[active]}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-3 border-t border-rule pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                      <div className="sm:text-right">
                        <span className="num font-serif text-[18px] font-bold">{eur(meal.price)}</span>
                        <span className="ml-1 text-[12px] text-muted-foreground sm:ml-0 sm:block">per portion</span>
                      </div>
                      <Button variant="secondary" className="min-h-10 px-3 text-[14px]"
                        onClick={() => {
                          set({ swaps: { ...swaps, [i]: (swaps[i] ?? 0) + 1 }, ...(r.day === "Sat" ? { reelAdded: false } : {}) });
                          const b = base!.uses[0];
                          toast(b === "potatoes" ? "Swapped. The plan still uses all 1.5 kg of potatoes." : `Swapped. The plan still uses the same ${b}.`);
                        }}><RefreshCw className="size-4" strokeWidth={1.8} aria-hidden />Swap</Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      }
      side={
        <div className="space-y-4">
          <section aria-labelledby="tw" className="card p-5">
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
          <section aria-labelledby="reel" className="card p-5">
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
  const sel = dailyPicks.find((p) => p.id === pick) ?? dailyPicks[0]!;
  return (
    <div>
      <h2 className="mb-4 text-[18px]">Tonight, pick one</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {dailyPicks.map((p) => {
          const on = p.id === sel.id;
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => set({ pick: p.id })}
              className={cn("card group overflow-hidden p-2.5 text-left transition-transform duration-200 ease-kitchen hover:-translate-y-0.5", on && "border-basil shadow-[0_0_0_1px_var(--basil)]")}>
              <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-sheet-2">
                <img src={p.image} alt={p.alt} width={600} height={450} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              </div>
              <div className="px-1.5 pb-1.5"><h3 className="mt-3 text-[18px] font-bold">{p.title}</h3>
              <p className="num text-[13px] text-muted-foreground">{p.minutes} min · {eur(p.price)} per portion</p>
              <Chip tone={p.tone} className="mt-2">{p.reason}</Chip></div>
            </button>
          );
        })}
      </div>
      <div className="card mt-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-[19px] font-bold">{sel.title}</h3>
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
