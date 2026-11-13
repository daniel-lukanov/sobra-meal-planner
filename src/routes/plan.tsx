import { useExp } from "@/lib/experiment";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { dailyPicks, type PrepRow } from "@/data/plan";
import { mealPhoto, photo } from "@/data/photos";
import { Clock, Link2, RefreshCw } from "lucide-react";
import { Button, Tape, UnderlineTabs } from "@/components/sobra/ui";
import { ModeQuestion } from "@/components/sobra/ModeQuestion";
import { SharePlan } from "@/components/sobra/SharePlan";
import { COMING_SOON, alternatives, fitsDiet } from "@/lib/week";
import { useWeek } from "@/lib/use-week";
import { useLivePlan } from "@/lib/live-plan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  head: pageHead("Your week", "Six dinners for the week, priced from this week's supermarket deals.", true),
  component: Plan,
});

function Plan() {
  const { store, mode, set, weekAccepted } = useApp();
  const switchMode = (m: "prep" | "daily") => {
    if (m === mode) return;
    const e = useExp.getState();
    e.track("mode_switched");
    set({ mode: m });
  };
  // Remember which modes the tester has seen, for the mode question.
  const s = useExp((x) => x.session);
  const seen = mode === "prep" ? s?.opened_weekly : s?.opened_daily;
  useEffect(() => {
    if (s && !seen) useExp.getState().update(mode === "prep" ? { opened_weekly: true } : { opened_daily: true });
  }, [mode, seen, s]);
  return (
    <>
      <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="max-w-[640px]">
          <p className="eyebrow">Prices from {store}</p>
          <h1 className="mt-1 text-[28px] font-bold md:text-[32px]">{mode === "prep" ? "Cook twice this week, eat something different every night" : "Pick tonight's dinner"}</h1>
        </div>
        <div><UnderlineTabs label="Planning mode" value={mode} onChange={switchMode}
          options={[{ value: "prep", label: "Weekly prep" }, { value: "daily", label: "Daily pick" }]} /></div>
      </header>
      <ModeQuestion />
      <WeekBanner />
      {mode === "prep" ? <WeeklyPrep /> : <DailyPick />}
      {weekAccepted && <div className="mt-8"><SharePlan /></div>}
    </>
  );
}

function WeekBanner() {
  const { weekAccepted, set } = useApp();
  const navigate = useNavigate();
  const { cards, chapters } = useWeek();
  const prepMinutes = chapters.reduce((a, c) => a + (parseInt(c.prep.meta, 10) || 0), 0);
  const planning = useLivePlan();
  const items = planning.items(cards).filter((i) => !i.inFridge);
  return (
    <section aria-label="This week" data-tour="1" className="mb-8 flex flex-col gap-5 border-y border-rule py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <dl className="num grid grid-cols-3 gap-x-8">
          {[["Dinners", String(cards.length)], ["Total", eur(planning.weekTotal(cards))], ["Prep time", `${prepMinutes} min`]].map(([k, v], i) => (
            <div key={k}>
              <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{k}</dt>
              <dd className={cn("mt-1 font-serif text-[24px] leading-none text-ink", i === 1 ? "font-extrabold" : "font-medium")}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[12.5px] text-muted-foreground">{planning.planNote(cards)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="quiet" onClick={() => navigate({ to: "/list" })}>See shopping list ({items.length})</Button>
        {weekAccepted ? <span className="inline-flex min-h-11 items-center px-2 font-semibold text-basil">Week accepted</span> : (
          <Button onClick={() => { useExp.getState().track("accepted_week_clicked"); set({ weekAccepted: true }); toast("Week accepted. Your shopping list is ready."); }}>Accept this week</Button>
        )}
      </div>
    </section>
  );
}

const labelOf = (slug: string, names?: Record<string, string>) => names?.[slug] ?? (slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "));
const prepTape: Record<string, string> = { Sun: "Sunday prep", Wed: "Wednesday prep" };

function PrepBanner({ row }: { row: PrepRow }) {
  const navigate = useNavigate();
  const text = `${row.meta}${row.tags.length ? `: ${row.tags.join(", ")}` : ""}`;
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-l-[3px] border-basil pl-4">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-basil">{prepTape[row.day] ?? row.title}</p>
        <p className="mt-1 text-[15px] font-medium text-ink">{text}</p>
      </div>
      <Button variant="quiet" className="underline underline-offset-4" onClick={() => navigate({ to: "/cook", hash: "prep" })}>See the prep timeline</Button>
    </div>
  );
}

function WeeklyPrep() {
  const { chosen, diet, set } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [tiktok, setTiktok] = useState(false);
  const { ctx, chapters } = useWeek();
  const navigate = useNavigate();
  const planning = useLivePlan();
  // Filter tabs: the ingredients that most of this week's dinners share.
  const names: Record<string, string> = {};
  const tally = new Map<string, number>();
  for (const c of chapters) for (const d of c.days) for (const u of d.meal.uses) { tally.set(u, (tally.get(u) ?? 0) + 1); names[u] ??= labelOf(u, d.meal.names); }
  const bases: { id: string | null; label: string }[] = [{ id: null, label: "All dinners" },
    ...[...tally].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4).map(([id]) => ({ id, label: names[id]! }))];

  return (
    <div>
      <div role="group" aria-label="Show dinners that use" className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-rule">
        {bases.map((b) => (
          <button key={b.label} type="button" aria-pressed={filter === b.id} onClick={() => setFilter(b.id)}
            className={cn("-mb-px min-h-11 border-b-2 text-[14px] font-semibold transition-colors", filter === b.id ? "border-basil text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>
            {b.label}
          </button>
        ))}
      </div>

      {chapters.map((ch, ci) => (
        <section key={ci} aria-label={prepTape[ch.prep.day] ?? ch.prep.title}>
          <PrepBanner row={ch.prep} />
          <ul className={cn("grid grid-cols-1 gap-5 md:grid-cols-3", ci === 0 ? "mb-10" : "mb-8")}>
            {ch.days.map(({ i, day, meal }, k) => {
              const lit = !!filter && meal.uses.includes(filter);
              const alts = swapping === i ? alternatives(i, chosen, diet, ctx) : [];
              return (
                <li key={i} className={cn("flex flex-col overflow-hidden rounded-sheet bg-sheet transition-all duration-200", filter && !lit && "opacity-50")}>
                  <div className="relative h-48 bg-sheet-2">
                    <img src={meal.image ?? mealPhoto[meal.title] ?? photo.prep} alt={meal.title} width={600} height={384} loading="lazy" className="size-full object-cover" />
                    <div className="absolute left-3 top-3"><Tape alt={k % 2 === 1}>{day}</Tape></div>
                    <span className="num absolute right-3 top-3 rounded-[6px] bg-sheet px-2.5 py-1 text-[15px] font-semibold">{eur(planning.priceOf(meal))}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-[19px] font-bold">{meal.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground"><Clock className="size-3.5" aria-hidden />{meal.how}</p>
                    {lit && <p className="slide-in mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-basil"><Link2 className="size-3.5" aria-hidden />Uses your prepped {(names[filter!] ?? filter!).toLowerCase()}</p>}
                    {meal.slug !== undefined && <Button variant="quiet" className="mt-2 w-fit px-0 text-[13.5px] underline underline-offset-4" onClick={() => navigate({ to: "/cook", search: { recipe: meal.slug! } })}>Cook this dinner</Button>}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-3">
                      <p className="min-w-0 text-[13px] text-muted-foreground">Uses {meal.uses.map((u) => labelOf(u, meal.names).toLowerCase()).join(", ")}</p>
                      <Button variant="secondary" aria-expanded={swapping === i} className="min-h-9 shrink-0 px-3 text-[13.5px]" onClick={() => setSwapping(swapping === i ? null : i)}>
                        <RefreshCw className="size-3.5" strokeWidth={1.8} aria-hidden />Swap
                      </Button>
                    </div>
                    {swapping === i && (
                      <div className="slide-in mt-3 border-t border-rule pt-3">
                        {alts.length === 0 ? <p className="text-[13.5px]">No other dinner fits your settings right now.</p> : (
                          <>
                            <p className="text-[12.5px] font-semibold text-muted-foreground">Pick a different dinner for {day}</p>
                            <ul className="mt-2 space-y-1.5">
                              {alts.map((a) => (
                                <li key={a.title}>
                                  <button type="button" onClick={() => {
                                    set({ chosen: { ...chosen, [i]: a.title }, weekAccepted: false });
                                    useExp.getState().track("swap");
                                    setSwapping(null);
                                    toast(`${day} is now ${a.title}. Shopping list and total updated.`);
                                  }} className="press flex min-h-11 w-full items-center justify-between gap-3 bg-sheet-2 px-3 text-left text-[14px] hover:bg-sheet-hover">
                                    <span className="font-medium">{a.title}</span><span className="num shrink-0 text-muted-foreground">{eur(planning.priceOf(a))}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="border-t border-rule pt-5">
        <Button variant="secondary" onClick={() => { useExp.getState().track("fake_door_tiktok"); setTiktok(true); }}>Import a recipe from TikTok or Instagram (coming soon)</Button>
        {tiktok && <p role="status" className="mt-2 text-[14px] text-muted-foreground">{COMING_SOON}</p>}
      </div>
    </div>
  );
}

/** What each sample daily pick needs, used only when the database recipes are not loaded. */
const pickNeeds: Record<string, { id: string; name: string }[]> = {
  rice: [{ id: "rice", name: "Rice" }, { id: "chicken", name: "Chicken thighs" }, { id: "spinach", name: "Spinach" }, { id: "soy", name: "Soy sauce" }],
  curry: [{ id: "chickpeas", name: "Chickpeas" }, { id: "rice", name: "Rice" }, { id: "onion", name: "Onion" }, { id: "coconut", name: "Coconut milk" }],
  pasta: [{ id: "tuna", name: "Canned tuna" }, { id: "onion", name: "Onion" }, { id: "spaghetti", name: "Spaghetti" }],
};
type DailyCard = { id: string; title: string; minutes: number; price: number; reason: string; image: string; alt: string; slug?: string; needs: { id: string; name: string }[] };
const tones = ["bg-tomato-tint text-tomato", "bg-mustard-tint text-mustard-ink", "bg-basil-tint text-basil"];

function DailyPick() {
  const { pick, set, fridge, checked, have, diet, store } = useApp();
  const navigate = useNavigate();
  const planning = useLivePlan();
  const { ctx } = useWeek();
  const [showMissing, setShowMissing] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const inFridge = new Set(fridge.map((f) => (f.id === "onions" ? "onion" : f.id)));
  const has = (u: string) => [...inFridge].some((id) => id === u || id.startsWith(`${u}-`));
  // Tonight's three: dinners that fit the diet, ranked by how much of them is already in the fridge, then by speed. Different meal types.
  const cards: DailyCard[] = ctx.live ? (() => {
    const eligible = ctx.pool.filter((m) => fitsDiet(m, diet));
    const ranked = eligible.map((m) => ({ m, have: m.uses.filter(has).length, quick: m.tags?.includes("quick") ? 1 : 0 }))
      .sort((a, b) => b.have / Math.max(1, b.m.uses.length) - a.have / Math.max(1, a.m.uses.length) || b.quick - a.quick || (a.m.minutes ?? 99) - (b.m.minutes ?? 99) || a.m.title.localeCompare(b.m.title));
    const out: typeof ranked = [], types = new Set<string>();
    for (const r of ranked) { if (out.length === 3) break; if (!types.has(r.m.type ?? "")) { out.push(r); types.add(r.m.type ?? ""); } }
    return out.map(({ m, have: h }) => ({
      id: m.slug!, title: m.title, minutes: m.minutes ?? 20, price: planning.priceOf(m) / 2, slug: m.slug!,
      reason: h > 0 ? `Uses ${h} thing${h === 1 ? "" : "s"} you already have` : m.tags?.includes("quick") ? "Quick tonight" : "Something different",
      image: m.image ?? mealPhoto[m.title] ?? photo.prep, alt: m.title,
      needs: m.uses.map((u) => ({ id: u, name: (m.names?.[u] ?? u) })),
    }));
  })() : dailyPicks.map((p) => ({ id: p.id, title: p.title, minutes: p.minutes, price: p.price, reason: p.reason, image: p.image, alt: p.alt, needs: pickNeeds[p.id] ?? [] }));
  const sel = cards.find((p) => p.id === pick) ?? cards[0]!;
  const missing = sel.needs.filter((n) => !has(n.id) && !checked[n.id] && !have.includes(n.id));
  return (
    <div>
      <h2 className="mb-4 text-[20px]">Tonight, pick one</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map((p, k) => {
          const on = p.id === sel.id;
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => { set({ pick: p.id }); setShowMissing(false); }}
              className={cn("group flex flex-col overflow-hidden rounded-sheet border-2 bg-sheet text-left transition-all duration-200", on ? "border-basil" : "border-transparent")}>
              <div className="h-52 overflow-hidden bg-sheet-2">
                <img src={p.image} alt={p.alt} width={600} height={416} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
              <div className="p-4">
                <h3 className="text-[19px] font-bold">{p.title}</h3>
                <p className="num text-[13px] text-muted-foreground">{p.minutes} min, {eur(p.price)} a portion</p>
                <span className={cn("mt-3 inline-flex rounded-[6px] px-2.5 py-1 text-[12.5px] font-semibold", tones[k % 3])}>{p.reason}</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] text-muted-foreground">{ctx.live ? `Prices from ${store}'s website, where we have them. Check the shelf before you buy.` : "Sample prices, no guarantee."}</p>
      <div className="mt-6 rounded-sheet bg-sheet p-5">
        <h3 className="text-[19px] font-bold">{sel.title}</h3>
        <p className="text-[14px] text-muted-foreground">{missing.length === 0 ? "You have everything for this one." : `We can't see ${missing.length === 1 ? "1 item" : `${missing.length} items`} in your fridge or ticked on your list.`}</p>
        {showMissing && missing.length > 0 && (
          <div className="slide-in mt-3">
            <ul className="space-y-1">{missing.map((m) => <li key={m.id} className="text-[15px]">{m.name}</li>)}</ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => set({ have: [...new Set([...have, ...missing.map((m) => m.id)])] })}>I have these</Button>
              <Button variant="quiet" onClick={() => navigate({ to: "/list" })}>Go to shopping list</Button>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {missing.length === 0
            ? <Button onClick={() => navigate(sel.slug ? { to: "/cook", search: { recipe: sel.slug } } : { to: "/cook" })}>Got everything? Start cooking</Button>
            : !showMissing && <Button onClick={() => setShowMissing(true)}>See what's missing</Button>}
          <Button variant="quiet" onClick={() => { useExp.getState().track("fake_door_delivery"); setDelivery(true); }}>Order groceries for tonight (coming soon)</Button>
        </div>
        {delivery && <p role="status" className="mt-2 text-[14px] text-muted-foreground">{COMING_SOON} We mean supermarket groceries delivered, not takeaway.</p>}
      </div>
    </div>
  );
}
