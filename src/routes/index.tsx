import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, Link2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useExp } from "@/lib/experiment";
import { eur, storesLabel, useApp } from "@/lib/store";
import { fitsPrefs } from "@/lib/prefs";
import { isRealDeal, realSaving } from "@/data/deals";
import type { Meal, PrepRow } from "@/data/plan";
import { dealPhoto, mealPhoto, photo } from "@/data/photos";
import { Button, Tape, UnderlineTabs } from "@/components/pratico/ui";
import { ModeQuestion } from "@/components/pratico/ModeQuestion";
import { SharePlan } from "@/components/pratico/SharePlan";
import { AddToPlan } from "@/components/pratico/AddToPlan";
import { StoreBadge } from "@/components/pratico/Brand";
import { COMING_SOON, REMOVED, alternatives, emptySlots, proposals, weekSlots } from "@/lib/week";
import { useWeek } from "@/lib/use-week";
import { useLivePlan } from "@/lib/live-plan";
import { useLiveDeals } from "@/lib/live-deals";
import { useIngredients } from "@/lib/db-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "pratico: cook twice a week, eat something different every night" },
    { name: "description", content: "Pratico plans your week's dinners around what's on promotion at your Lisbon supermarkets and what's already in your fridge." },
    { property: "og:title", content: "pratico: cook twice a week, eat something different every night" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

const labelOf = (slug: string, names?: Record<string, string>) => names?.[slug] ?? (slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "));
const prepTape: Record<string, string> = { Sun: "Sunday prep", Wed: "Wednesday prep" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const imageOf = (m: Meal) => m.image ?? mealPhoto[m.title] ?? photo.prep;

/** Does the fridge hold this base ingredient (or a cut of it)? */
function useHas() {
  const fridge = useApp((s) => s.fridge);
  return useMemo(() => {
    const ids = fridge.map((f) => (f.id === "onions" ? "onion" : f.id));
    return (u: string) => ids.some((id) => id === u || id.startsWith(`${u}-`));
  }, [fridge]);
}

function Home() {
  const { stores, mode, set, weekAccepted } = useApp();
  const store = storesLabel(stores);
  const switchMode = (m: "prep" | "daily") => {
    if (m === mode) return;
    useExp.getState().track("mode_switched");
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
      <WeekStatusNote />
      {mode === "daily" ? <DailyPick /> : <Today />}
      <ThisWeek />
      <Proposed />
      <DealsPanel />
      {weekAccepted && <div className="mt-8"><SharePlan /></div>}
    </>
  );
}

/** Says why the week is empty or short. There is no sample week to fall back on, and an allergy is never overridden. */
function WeekStatusNote() {
  const { status, cards, fitting } = useWeek();
  const { mode } = useApp();
  if (status === "loading") return <p role="status" className="mb-6 text-muted-foreground">Loading this week's dinners and prices.</p>;
  if (status === "error") return <p role="alert" className="mb-6 text-tomato">We could not load the recipes. Reload the page and try again.</p>;
  const settings = <Link to="/account" className="underline underline-offset-4">your account settings</Link>;
  if (status === "none") return <p role="status" className="mb-6 rounded-sheet bg-sheet p-5">None of our recipes fit {settings} yet. We never show a dinner with an ingredient you avoid. Loosen a food or allergy choice, and more recipes are on the way.</p>;
  if (mode === "prep" && cards.length < 6) return <p role="status" className="mb-6 rounded-sheet bg-sheet p-5">Only {fitting} {fitting === 1 ? "recipe fits" : "recipes fit"} {settings}, so this week has {cards.length} {cards.length === 1 ? "dinner" : "dinners"} instead of 6. We never show a dinner with an ingredient you avoid.</p>;
  return null;
}

/** One dinner pinned on top: what is missing for it, and one click to start cooking. */
function PinnedMeal({ meal, eyebrow }: { meal: Meal; eyebrow: string }) {
  const { checked, have, set } = useApp();
  const has = useHas();
  const planning = useLivePlan();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(false);
  const missing = meal.uses.filter((u) => !has(u) && !checked[u] && !have.includes(u));
  return (
    <section aria-label={eyebrow} className="mb-10 grid overflow-hidden rounded-sheet bg-sheet md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="h-52 bg-sheet-2 md:h-full"><img src={imageOf(meal)} alt={meal.title} width={600} height={416} className="size-full object-cover" /></div>
      <div className="p-5">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-[24px] font-bold">{meal.title}</h2>
        <p className="num text-[13.5px] text-muted-foreground">{meal.minutes ?? 20} min, {eur(planning.priceOf(meal) / 2)} a portion</p>
        <p className="mt-3 text-[14.5px]">{missing.length === 0 ? "You have everything for this one." : `Missing: ${missing.map((u) => labelOf(u, meal.names).toLowerCase()).join(", ")}.`}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {meal.slug !== undefined && <Button onClick={() => navigate({ to: "/cook", search: { recipe: meal.slug! } })}>Start cooking</Button>}
          {meal.slug !== undefined && <Link to="/recipe/$slug" params={{ slug: meal.slug }} className="inline-flex min-h-11 items-center px-3 text-[14.5px] font-medium underline underline-offset-4">View recipe</Link>}
          {missing.length > 0 && <Button variant="secondary" onClick={() => set({ have: [...new Set([...have, ...missing])] })}>I have these</Button>}
          {missing.length > 0 && <Link to="/list" className="inline-flex min-h-11 items-center px-3 text-[14.5px] font-medium underline underline-offset-4">Shopping list</Link>}
        </div>
        <button type="button" onClick={() => { useExp.getState().track("fake_door_delivery"); setDelivery(true); }} className="mt-3 text-[13px] text-muted-foreground underline underline-offset-4">Order groceries for tonight (coming soon)</button>
        {delivery && <p role="status" className="mt-2 text-[13.5px] text-muted-foreground">{COMING_SOON} We mean supermarket groceries delivered, not takeaway.</p>}
      </div>
    </section>
  );
}

/** Weekly prep mode: today's dinner from the plan, or what is next. */
function Today() {
  const { cards, chapters, status } = useWeek();
  if (status !== "ready") return null;
  const day = WEEKDAYS[new Date().getDay()]!;
  const today = cards.find((c) => c.day === day);
  const prep = chapters.find((ch) => ch.prep.day === day)?.prep;
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const next = cards.find((c) => order.indexOf(c.day) > order.indexOf(day));
  return (
    <>
      {prep && <div className="mb-6"><PrepBanner row={prep} /></div>}
      {today ? <PinnedMeal meal={today.meal} eyebrow={`Today, ${today.day}`} />
        : next ? <PinnedMeal meal={next.meal} eyebrow={`Next up, ${next.day}`} />
        : <p className="mb-8 rounded-sheet bg-sheet p-5">Nothing planned today. Your next week starts on Monday.</p>}
    </>
  );
}

function PrepBanner({ row }: { row: PrepRow }) {
  const navigate = useNavigate();
  const text = `${row.meta}${row.tags.length ? `: ${row.tags.join(", ")}` : ""}`;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-l-[3px] border-basil pl-4">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-basil">{prepTape[row.day] ?? row.title}</p>
        <p className="mt-1 text-[15px] font-medium text-ink">{text}</p>
      </div>
      <Button variant="quiet" className="underline underline-offset-4" onClick={() => navigate({ to: "/cook", hash: "prep" })}>See the prep timeline</Button>
    </div>
  );
}

function WeekBanner() {
  const { weekAccepted, set } = useApp();
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
        <Link to="/list" className="inline-flex min-h-11 items-center px-3 text-[14.5px] font-medium underline underline-offset-4">See shopping list ({items.length})</Link>
        {weekAccepted ? <span className="inline-flex min-h-11 items-center px-2 font-semibold text-basil">Week accepted</span> : (
          <Button onClick={() => { useExp.getState().track("accepted_week_clicked"); set({ weekAccepted: true }); toast("Week accepted. Your shopping list is ready."); }}>Accept this week</Button>
        )}
      </div>
    </section>
  );
}

/** The generated starter week. Swap, remove or add dinners; the list and total follow. */
function ThisWeek() {
  const { chosen, set } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [tiktok, setTiktok] = useState(false);
  const { ctx, chapters, prefs, status } = useWeek();
  const planning = useLivePlan();
  const has = useHas();
  const props = useMemo(() => proposals(chosen, prefs, ctx, has, 1), [chosen, prefs, ctx, has]);
  if (status !== "ready") return null;
  const slots = new Map(weekSlots(chosen, ctx).map((s) => [s.i, s]));
  const names: Record<string, string> = {};
  const tally = new Map<string, number>();
  for (const c of chapters) for (const d of c.days) for (const u of d.meal.uses) { tally.set(u, (tally.get(u) ?? 0) + 1); names[u] ??= labelOf(u, d.meal.names); }
  const bases: { id: string | null; label: string }[] = [{ id: null, label: "All dinners" },
    ...[...tally].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4).map(([id]) => ({ id, label: names[id]! }))];

  // Chapters in the plan, including free days.
  const groups: { prep: PrepRow; days: { i: number; day: string }[] }[] = [];
  ctx.plan.forEach((row, i) => { if (row.kind === "prep") groups.push({ prep: row, days: [] }); else groups.at(-1)?.days.push({ i, day: row.day }); });

  const remove = (i: number, day: string) => {
    const before = chosen[i];
    set({ chosen: { ...chosen, [i]: REMOVED }, weekAccepted: false });
    toast(`${day} is free now.`, { action: { label: "Undo", onClick: () => { const c = { ...useApp.getState().chosen }; if (before === undefined) delete c[i]; else c[i] = before; useApp.getState().set({ chosen: c }); } } });
  };

  return (
    <div className="mt-2">
      <h2 className="mb-4 text-[20px]">This week</h2>
      <WeekBanner />
      <div role="group" aria-label="Show dinners that use" className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-rule">
        {bases.map((b) => (
          <button key={b.label} type="button" aria-pressed={filter === b.id} onClick={() => setFilter(b.id)}
            className={cn("-mb-px min-h-11 border-b-2 text-[14px] font-semibold transition-colors", filter === b.id ? "border-basil text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>
            {b.label}
          </button>
        ))}
      </div>
      {groups.map((ch, ci) => (
        <section key={ci} aria-label={prepTape[ch.prep.day] ?? ch.prep.title}>
          <div className="mb-5"><PrepBanner row={ch.prep} /></div>
          <ul className={cn("grid grid-cols-1 gap-5 md:grid-cols-3", ci === 0 ? "mb-10" : "mb-8")}>
            {ch.days.map(({ i, day }, k) => {
              const meal = slots.get(i)?.meal ?? null;
              if (!meal) {
                const p = props[0];
                return (
                  <li key={i} className="flex min-h-48 flex-col justify-between rounded-sheet border-2 border-dashed border-rule p-4">
                    <div><Tape alt={k % 2 === 1}>{day}</Tape><p className="mt-3 text-[17px] font-semibold">Free day</p></div>
                    {p ? <Button variant="secondary" onClick={() => { set({ chosen: { ...chosen, [i]: p.title }, weekAccepted: false }); toast(`${p.title} added for ${day}.`); }}><Plus className="size-4" aria-hidden />Add {p.title}</Button>
                      : <p className="text-[13.5px] text-muted-foreground">No other recipe fits your settings.</p>}
                  </li>
                );
              }
              const lit = !!filter && meal.uses.includes(filter);
              const alts = swapping === i ? alternatives(i, chosen, prefs, ctx) : [];
              return (
                <li key={i} className={cn("flex flex-col overflow-hidden rounded-sheet bg-sheet transition-all duration-200", filter && !lit && "opacity-50")}>
                  <div className="relative h-48 bg-sheet-2">
                    <img src={imageOf(meal)} alt={meal.title} width={600} height={384} loading="lazy" className="size-full object-cover" />
                    <div className="absolute left-3 top-3"><Tape alt={k % 2 === 1}>{day}</Tape></div>
                    <span className="num absolute right-3 top-3 rounded-[6px] bg-sheet px-2.5 py-1 text-[15px] font-semibold">{eur(planning.priceOf(meal))}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-[19px] font-bold">{meal.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground"><Clock className="size-3.5" aria-hidden />{meal.how}</p>
                    {lit && <p className="slide-in mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-basil"><Link2 className="size-3.5" aria-hidden />Uses your prepped {(names[filter!] ?? filter!).toLowerCase()}</p>}
                    {meal.slug !== undefined && (
                      <div className="mt-2 flex flex-wrap gap-x-4">
                        <Link to="/recipe/$slug" params={{ slug: meal.slug }} className="inline-flex min-h-9 items-center text-[13.5px] font-medium underline underline-offset-4">View recipe</Link>
                        <Link to="/cook" search={{ recipe: meal.slug }} className="inline-flex min-h-9 items-center text-[13.5px] font-medium underline underline-offset-4">Start cooking</Link>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-3">
                      <p className="min-w-0 text-[13px] text-muted-foreground">Uses {meal.uses.map((u) => labelOf(u, meal.names).toLowerCase()).join(", ")}</p>
                      <div className="flex shrink-0 gap-1.5">
                        <Button variant="secondary" aria-expanded={swapping === i} className="min-h-9 px-3 text-[13.5px]" onClick={() => setSwapping(swapping === i ? null : i)}>
                          <RefreshCw className="size-3.5" strokeWidth={1.8} aria-hidden />Swap
                        </Button>
                        <Button variant="secondary" aria-label={`Remove ${meal.title}`} className="min-h-9 px-3" onClick={() => remove(i, day)}><Trash2 className="size-3.5" strokeWidth={1.8} aria-hidden /></Button>
                      </div>
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
      <MissingNow />
      <div className="mt-8 border-t border-rule pt-5">
        <Button variant="secondary" onClick={() => { useExp.getState().track("fake_door_tiktok"); setTiktok(true); }}>Import a recipe from TikTok or Instagram (coming soon)</Button>
        {tiktok && <p role="status" className="mt-2 text-[14px] text-muted-foreground">{COMING_SOON}</p>}
      </div>
    </div>
  );
}

/** What this week still needs that is not in the fridge, with a link to the full list. */
function MissingNow() {
  const { cards } = useWeek();
  const planning = useLivePlan();
  const items = planning.items(cards).filter((i) => !i.inFridge);
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="missing" className="rounded-sheet bg-sheet p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id="missing" className="text-[18px] font-bold">Missing for this week ({items.length})</h3>
        <Link to="/list" className="text-[14.5px] font-medium underline underline-offset-4">Open the shopping list</Link>
      </div>
      {items.length === 0 ? <p className="mt-2 text-[14.5px] text-muted-foreground">You have everything this week needs.</p> : (
        <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {items.slice(0, 8).map((it) => <li key={it.id} className="flex justify-between gap-3 text-[14.5px]"><span>{it.name}</span><span className="num text-muted-foreground">{it.price != null ? eur(it.price) : ""}</span></li>)}
          {items.length > 8 && <li className="text-[13.5px] text-muted-foreground">and {items.length - 8} more</li>}
        </ul>
      )}
    </section>
  );
}

/** Dinners that fill the free days, one click each. */
function Proposed() {
  const { chosen, set } = useApp();
  const { ctx, prefs, status } = useWeek();
  const has = useHas();
  const planning = useLivePlan();
  const free = emptySlots(chosen, ctx);
  const list = useMemo(() => proposals(chosen, prefs, ctx, has, 3), [chosen, prefs, ctx, has]);
  if (status !== "ready" || free.length === 0) return null;
  return (
    <section aria-labelledby="prop" className="mt-10">
      <h2 id="prop" className="mb-1 text-[20px]">Proposed meals</h2>
      <p className="mb-4 text-[14px] text-muted-foreground">{free.length === 1 ? `${free[0]!.day} is free.` : `${free.map((f) => f.day).join(", ")} are free.`} These fit your settings and reuse what you already buy.</p>
      {list.length === 0 ? <p className="text-muted-foreground">No other recipe fits your settings yet.</p> : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {list.map((m, k) => {
            const slot = free[Math.min(k, free.length - 1)]!;
            return (
              <li key={m.title} className="flex flex-col overflow-hidden rounded-sheet bg-sheet">
                <div className="h-36 bg-sheet-2"><img src={imageOf(m)} alt="" width={600} height={288} loading="lazy" className="size-full object-cover" /></div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[18px] font-bold">{m.title}</h3>
                  <p className="num text-[13px] text-muted-foreground">{m.minutes ?? 20} min, {eur(planning.priceOf(m))} for {useApp.getState().people}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button className="min-h-10" onClick={() => { set({ chosen: { ...chosen, [slot.i]: m.title }, weekAccepted: false }); toast(`${m.title} added for ${slot.day}.`); }}>Add to {slot.day}</Button>
                    {m.slug !== undefined && <Link to="/recipe/$slug" params={{ slug: m.slug }} className="text-[13.5px] font-medium underline underline-offset-4">View recipe</Link>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** This week's real deals on ingredients we have recipes for, with the recipes that use them. */
function DealsPanel() {
  const { stores } = useApp();
  const live = useLiveDeals().data;
  const ings = useIngredients();
  const { ctx, prefs, status } = useWeek();
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => {
    if (!live || !ings.data || status !== "ready") return [];
    const bySlug = new Map(ings.data.map((i) => [i.slug, i]));
    const byId = new Map(ings.data.map((i) => [i.id, i]));
    const fitting = ctx.pool.filter((m) => fitsPrefs(m, prefs));
    const out: { key: string; store: (typeof stores)[number]; deal: NonNullable<typeof live[keyof typeof live]>[number]; base: string; recipes: Meal[] }[] = [];
    for (const st of stores) for (const d of live[st] ?? []) {
      if (!d.slug || !isRealDeal(d)) continue;
      const ing = bySlug.get(d.slug);
      const base = (ing?.parent_id && byId.get(ing.parent_id)?.slug) || d.slug;
      const recipes = fitting.filter((m) => m.uses.includes(base));
      if (recipes.length) out.push({ key: `${st}-${d.id ?? d.name}`, store: st, deal: d, base, recipes });
    }
    return out.sort((a, b) => realSaving(b.deal) - realSaving(a.deal)).slice(0, 4);
  }, [live, ings.data, status, ctx.pool, prefs, stores]);
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="deals" className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="deals" className="text-[20px]">Deals you can cook with</h2>
        <Link to="/deals" className="text-[14.5px] font-medium underline underline-offset-4">All deals</Link>
      </div>
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.key} className="overflow-hidden rounded-sheet bg-sheet">
            <div className="flex gap-4 p-4">
              <img src={dealPhoto(r.deal.photoKey ?? r.deal.name)} alt="" width={96} height={96} loading="lazy" className="size-20 shrink-0 rounded-[8px] object-cover" />
              <div className="min-w-0 flex-1">
                <StoreBadge name={r.store} className="h-6 px-2" />
                <h3 className="mt-1 text-[17px] font-bold">{r.deal.name}</h3>
                <p className="num text-[14px]"><span className="font-bold">{eur(r.deal.price)}</span> <span className="text-muted-foreground line-through">{eur(r.deal.was)}</span> <span className="text-basil">{eur(realSaving(r.deal))} cheaper than the regular price</span></p>
              </div>
            </div>
            <div className="border-t border-rule px-4 py-3">
              <Button variant="secondary" className="min-h-10" aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? null : r.key)}>Build recipe</Button>
              {open === r.key && (
                <ul className="slide-in mt-3 space-y-3">
                  {r.recipes.slice(0, 3).map((m) => (
                    <li key={m.title} className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold">{m.title}</p>
                        {m.slug !== undefined && <Link to="/recipe/$slug" params={{ slug: m.slug }} className="text-[13px] underline underline-offset-4">View recipe</Link>}
                      </div>
                      <AddToPlan meal={m} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

type DailyCard = { id: string; title: string; minutes: number; price: number; reason: string; meal: Meal };
const tones = ["bg-tomato-tint text-tomato", "bg-mustard-tint text-mustard-ink", "bg-basil-tint text-basil"];

/** Daily pick mode: three dinners for tonight, ranked by what is already in the fridge. The chosen one is pinned below. */
function DailyPick() {
  const { pick, set } = useApp();
  const planning = useLivePlan();
  const { ctx, prefs, status } = useWeek();
  const has = useHas();
  const cards: DailyCard[] = (() => {
    const ranked = ctx.pool.filter((m) => m.slug && fitsPrefs(m, prefs)).map((m) => ({ m, have: m.uses.filter(has).length, quick: m.tags?.includes("quick") ? 1 : 0 }))
      .sort((a, b) => b.have / Math.max(1, b.m.uses.length) - a.have / Math.max(1, a.m.uses.length) || b.quick - a.quick || (a.m.minutes ?? 99) - (b.m.minutes ?? 99) || a.m.title.localeCompare(b.m.title));
    const out: typeof ranked = [], types = new Set<string>();
    for (const r of ranked) { if (out.length === 3) break; if (!types.has(r.m.type ?? "")) { out.push(r); types.add(r.m.type ?? ""); } }
    return out.map(({ m, have: h }) => ({
      id: m.slug!, title: m.title, minutes: m.minutes ?? 20, price: planning.priceOf(m) / 2, meal: m,
      reason: h > 0 ? `Uses ${h} thing${h === 1 ? "" : "s"} you already have` : m.tags?.includes("quick") ? "Quick tonight" : "Something different",
    }));
  })();
  if (status !== "ready" || cards.length === 0) return null;
  const sel = cards.find((p) => p.id === pick) ?? cards[0]!;
  return (
    <div>
      <h2 className="mb-4 text-[20px]">Tonight, pick one</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map((p, k) => {
          const on = p.id === sel.id;
          return (
            <button key={p.id} type="button" aria-pressed={on} onClick={() => set({ pick: p.id })}
              className={cn("group flex flex-col overflow-hidden rounded-sheet border-2 bg-sheet text-left transition-all duration-200", on ? "border-basil" : "border-transparent")}>
              <div className="h-52 overflow-hidden bg-sheet-2">
                <img src={imageOf(p.meal)} alt={p.title} width={600} height={416} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
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
      <div className="mt-6"><PinnedMeal meal={sel.meal} eyebrow="Tonight" /></div>
    </div>
  );
}
