import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChefHat, RefreshCw, Trash2 } from "lucide-react";
import { useExp } from "@/lib/experiment";
import { eur, storesLabel, useApp } from "@/lib/store";
import { fitsPrefs } from "@/lib/prefs";
import { isRealDeal, realSaving, type Deal } from "@/data/deals";
import type { Meal } from "@/data/plan";
import { dealPhoto, mealPhoto, photo } from "@/data/photos";
import { Button, Tape } from "@/components/pratico/ui";
import { ModeQuestion } from "@/components/pratico/ModeQuestion";
import { SharePlan } from "@/components/pratico/SharePlan";
import { StoreBadge } from "@/components/pratico/Brand";
import { labelOf, todayName, useCookFlow, useCovered, usePlaceFlow, useTonight } from "@/components/pratico/PlanFlows";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { REMOVED, alternatives, proposals, weekSlots, type Card } from "@/lib/week";
import { useWeek } from "@/lib/use-week";
import { useLivePlan } from "@/lib/live-plan";
import { useLiveDeals } from "@/lib/live-deals";
import { useIngredients } from "@/lib/db-queries";
import type { StoreName } from "@/data/stores";
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

const imageOf = (m: Meal) => m.image ?? mealPhoto[m.title] ?? photo.prep;

/** The dinners Home is about: the week in Weekly prep, tonight's in Daily pick. */
function usePlanned(): Card[] {
  const { mode } = useApp();
  const { cards } = useWeek();
  const tonight = useTonight();
  if (mode === "prep") return cards;
  return tonight ? [{ i: -1, day: "Tonight", meal: tonight }] : [];
}

function Home() {
  const { stores, mode, weekAccepted } = useApp();
  const s = useExp((x) => x.session);
  const seen = mode === "prep" ? s?.opened_weekly : s?.opened_daily;
  useEffect(() => {
    if (s && !seen) useExp.getState().update(mode === "prep" ? { opened_weekly: true } : { opened_daily: true });
  }, [mode, seen, s]);
  return (
    <>
      <header className="pb-6">
        <p className="eyebrow">Prices from {storesLabel(stores)}</p>
        <h1 className="mt-1 text-[28px] font-bold md:text-[32px]">{mode === "prep" ? "Your week" : "Tonight"}</h1>
      </header>
      <ModeQuestion />
      <WeekStatusNote />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">{mode === "prep" ? <WeekSection /> : <TonightSection />}</div>
        {/* The plan sets the height; the list scrolls inside it. */}
        <div className="relative min-h-[360px]"><MissingPanel /></div>
      </div>
      <Suggested />
      <TopDeals />
      {mode === "prep" && weekAccepted && <div className="mt-8"><SharePlan /></div>}
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
  if (mode === "prep" && cards.length + Object.values(useApp.getState().chosen).filter((v) => v === REMOVED).length < 6) return <p role="status" className="mb-6 rounded-sheet bg-sheet p-5">Only {fitting} {fitting === 1 ? "recipe fits" : "recipes fit"} {settings}, so this week has fewer than 6 dinners. We never show a dinner with an ingredient you avoid.</p>;
  return null;
}

/** Weekly prep: today's dinner large with Start cooking, then every day of the week. */
function WeekSection() {
  const { chosen, set, weekAccepted } = useApp();
  const { ctx, chapters, prefs, status } = useWeek();
  const planning = useLivePlan();
  const cook = useCookFlow();
  const [swapping, setSwapping] = useState<number | null>(null);
  if (status !== "ready") return null;
  const slots = weekSlots(chosen, ctx);
  const day = todayName();
  const today = slots.find((s) => s.day === day);
  const prepToday = chapters.find((c) => c.prep.day === day)?.prep;
  const cards = slots.flatMap((s) => (s.meal ? [{ i: s.i, day: s.day, meal: s.meal }] : []));
  const remove = (i: number, d: string) => {
    const before = chosen[i];
    set({ chosen: { ...chosen, [i]: REMOVED }, weekAccepted: false });
    toast(`${d} is free now. Pick a suggestion below to fill it.`, { action: { label: "Undo", onClick: () => { const c = { ...useApp.getState().chosen }; if (before === undefined) delete c[i]; else c[i] = before; useApp.getState().set({ chosen: c }); } } });
  };
  const swapSlot = slots.find((s) => s.i === swapping);
  const alts = swapping !== null ? alternatives(swapping, chosen, prefs, ctx) : [];

  return (
    <section aria-labelledby="week" data-tour="1" className="rounded-sheet bg-sheet p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="week" className="text-[20px]">This week <span className="num ml-2 text-[15px] font-medium text-muted-foreground">{cards.length} dinners · {eur(planning.weekTotal(cards))}</span></h2>
        <div className="flex items-center gap-3">
          <Link to="/cook" hash="prep" className="text-[13.5px] underline underline-offset-4">Prep timeline</Link>
          {weekAccepted ? <span className="text-[14px] font-semibold text-basil">Week accepted</span>
            : <Button className="min-h-10" onClick={() => { useExp.getState().track("accepted_week_clicked"); set({ weekAccepted: true }); toast("Week accepted. Your shopping list is ready."); }}>Accept this week</Button>}
        </div>
      </div>

      {today?.meal ? (
        <div className="mb-4 grid overflow-hidden rounded-[8px] bg-sheet-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <img src={imageOf(today.meal)} alt={today.meal.title} width={480} height={300} className="h-44 w-full object-cover sm:h-full" />
          <div className="p-4">
            <p className="eyebrow">Today, {today.day}</p>
            <h3 className="mt-1 text-[22px] font-bold leading-tight">{today.meal.title}</h3>
            <p className="num mt-1 text-[13.5px] text-muted-foreground">{today.meal.minutes ?? 20} min · {eur(planning.priceOf(today.meal))}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => cook.start(today.meal!, today.i)}><ChefHat className="size-4" aria-hidden />Start cooking</Button>
              {today.meal.slug && <Link to="/recipe/$slug" params={{ slug: today.meal.slug }} className="text-[14px] underline underline-offset-4">View recipe</Link>}
            </div>
          </div>
        </div>
      ) : (
        <p className="mb-4 rounded-[8px] bg-sheet-2 p-4 text-[15px]">
          {prepToday ? <>Today is prep day: {prepToday.meta}. <Link to="/cook" hash="prep" className="underline underline-offset-4">See the timeline</Link>.</>
            : today ? "Today is free. Pick one of the suggestions below." : "No dinner planned today. Start any day's dinner below if you want to cook now."}
        </p>
      )}

      <ul className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-7 md:overflow-visible">
        {slots.map((s, k) => {
          const isToday = s.day === day;
          if (!s.meal) return (
            <li key={s.i} className={cn("flex min-w-[104px] flex-col rounded-[8px] border-2 border-dashed border-rule p-2 md:min-w-0", isToday && "border-basil")}>
              <Tape alt={k % 2 === 1}>{isToday ? `${s.day} · today` : s.day}</Tape>
              <p className="mt-2 text-[13px] font-semibold">Free</p>
              <p className="text-[11.5px] leading-snug text-muted-foreground">Add a suggestion below.</p>
            </li>
          );
          return (
            <li key={s.i} className={cn("flex min-w-[104px] flex-col overflow-hidden rounded-[8px] bg-sheet-2 md:min-w-0", isToday && "ring-2 ring-basil")}>
              <div className="relative h-16">
                <img src={imageOf(s.meal)} alt="" width={320} height={200} loading="lazy" className="size-full object-cover" />
                <div className="absolute left-1.5 top-1.5"><Tape alt={k % 2 === 1}>{isToday ? `${s.day} · today` : s.day}</Tape></div>
              </div>
              <div className="flex flex-1 flex-col p-2">
                {s.meal.slug ? <Link to="/recipe/$slug" params={{ slug: s.meal.slug }} className="line-clamp-3 text-[12.5px] font-semibold leading-snug hover:underline">{s.meal.title}</Link>
                  : <p className="line-clamp-3 text-[12.5px] font-semibold leading-snug">{s.meal.title}</p>}
                <div className="mt-auto space-y-1 pt-2">
                  <button type="button" onClick={() => cook.start(s.meal!, s.i)} className="press inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[6px] bg-basil px-1 text-[12.5px] font-semibold text-basil-ink">
                    <ChefHat className="size-3.5" aria-hidden />Cook
                  </button>
                  <div className="flex gap-1">
                    <button type="button" title="Swap" aria-label={`Swap ${s.meal.title}`} onClick={() => setSwapping(s.i)} className="press flex min-h-9 flex-1 items-center justify-center rounded-[6px] hover:bg-sheet-hover"><RefreshCw className="size-3.5" aria-hidden /></button>
                    <button type="button" title="Remove" aria-label={`Remove ${s.meal.title}`} onClick={() => remove(s.i, s.day)} className="press flex min-h-9 flex-1 items-center justify-center rounded-[6px] hover:bg-sheet-hover"><Trash2 className="size-3.5" aria-hidden /></button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12.5px] text-muted-foreground">{planning.planNote(cards)}</p>

      <Dialog open={swapping !== null} onOpenChange={(o) => { if (!o) setSwapping(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Swap {swapSlot?.day}'s dinner</DialogTitle>
            <DialogDescription>{swapSlot?.meal ? `Instead of ${swapSlot.meal.title}. These reuse what you prep for that half of the week.` : ""}</DialogDescription>
          </DialogHeader>
          {alts.length === 0 ? <p className="text-[14px]">No other dinner fits your settings right now.</p> : (
            <ul className="space-y-1.5">
              {alts.map((a) => (
                <li key={a.title}>
                  <button type="button" onClick={() => {
                    if (swapping === null) return;
                    set({ chosen: { ...chosen, [swapping]: a.title }, weekAccepted: false });
                    useExp.getState().track("swap");
                    toast(`${swapSlot?.day} is now ${a.title}. Shopping list updated.`);
                    setSwapping(null);
                  }} className="press flex min-h-11 w-full items-center justify-between gap-3 bg-sheet-2 px-3 text-left text-[14px] hover:bg-sheet-hover">
                    <span className="font-medium">{a.title}</span><span className="num shrink-0 text-muted-foreground">{eur(planning.priceOf(a))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      {cook.dialogs}
    </section>
  );
}

/** Daily pick: tonight's dinner, or an empty slot to fill from the suggestions. */
function TonightSection() {
  const { set } = useApp();
  const { status } = useWeek();
  const tonight = useTonight();
  const planning = useLivePlan();
  const cook = useCookFlow();
  if (status !== "ready") return null;
  return (
    <section aria-labelledby="tonight" className="h-full rounded-sheet bg-sheet p-4 md:p-5">
      <h2 id="tonight" className="mb-4 text-[20px]">Today, {todayName()}</h2>
      {tonight ? (
        <div className="grid overflow-hidden rounded-[8px] bg-sheet-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <img src={imageOf(tonight)} alt={tonight.title} width={480} height={300} className="h-48 w-full object-cover sm:h-full" />
          <div className="p-4">
            <h3 className="text-[22px] font-bold leading-tight">{tonight.title}</h3>
            <p className="num mt-1 text-[13.5px] text-muted-foreground">{tonight.minutes ?? 20} min · {eur(planning.priceOf(tonight))}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => cook.start(tonight)}><ChefHat className="size-4" aria-hidden />Start cooking</Button>
              {tonight.slug && <Link to="/recipe/$slug" params={{ slug: tonight.slug }} className="text-[14px] underline underline-offset-4">View recipe</Link>}
              <button type="button" onClick={() => set({ today: null })} className="text-[13.5px] text-muted-foreground underline underline-offset-4">Clear</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-[8px] border-2 border-dashed border-rule p-6 text-center">
          <p className="max-w-sm text-[15px]">Nothing picked for tonight yet. Choose one of the suggestions below. They are ranked by what is already in your fridge.</p>
        </div>
      )}
      {cook.dialogs}
    </section>
  );
}

/** What the planned dinners need that is not at home: the delta between the plan and the fridge. */
function MissingPanel() {
  const { have, checked, set, mode } = useApp();
  const planned = usePlanned();
  const planning = useLivePlan();
  const { status } = useWeek();
  const all = planning.items(planned);
  const missing = all.filter((i) => !i.inFridge && !checked[i.id]);
  const marked = all.filter((i) => have.includes(i.id));
  if (status !== "ready") return null;
  return (
    <aside aria-labelledby="missing" className="flex flex-col rounded-sheet bg-sheet p-4 md:p-5 lg:absolute lg:inset-0">
      <h2 id="missing" className="text-[20px]">Missing ingredients</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {planned.length === 0 ? (mode === "daily" ? "Pick tonight's dinner to see what it needs." : "Add dinners to see what they need.")
          : `What ${mode === "daily" ? "tonight's dinner needs" : "this week's dinners need"} and we can't see in your fridge. Anything you don't mark stays on your shopping list.`}
      </p>
      {planned.length > 0 && (missing.length === 0 ? <p className="mt-4 flex items-center gap-2 text-[15px] font-medium text-basil"><Check className="size-4" aria-hidden />You have everything.</p> : (
        <ul className="mt-3 min-h-0 flex-1 divide-y divide-rule overflow-y-auto pr-1">
          {missing.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block text-[14.5px] font-medium">{it.name}</span>
                <span className="block text-[12px] text-muted-foreground">for {it.dinners} {it.dinners === 1 ? "dinner" : "dinners"}{it.price != null ? ` · ${eur(it.price)}` : ""}{it.store && mode === "prep" ? ` · ${it.store}` : ""}</span>
              </span>
              <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[13px]" onClick={() => set({ have: [...new Set([...have, it.id])] })}>I have it</Button>
            </li>
          ))}
        </ul>
      ))}
      {marked.length > 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          At home: {marked.map((m) => m.name.split(" ")[0]).join(", ")}.{" "}
          <button type="button" className="underline underline-offset-4" onClick={() => set({ have: have.filter((h) => !marked.some((m) => m.id === h)) })}>Undo</button>
        </p>
      )}
      <div className="mt-auto shrink-0 pt-4">
        <Link to="/list" className="inline-flex min-h-11 w-full items-center justify-center rounded-ctl bg-sheet-2 px-4 text-[14.5px] font-semibold hover:bg-sheet-hover">
          Shopping list ({missing.length}){missing.length ? ` · ${eur(missing.reduce((a, i) => a + (i.price ?? 0), 0))}` : ""}
        </Link>
      </div>
    </aside>
  );
}

/** Dinners that fit the person and reuse what the plan or the fridge already has. One click to add. */
function Suggested() {
  const { chosen, mode } = useApp();
  const { ctx, prefs, status } = useWeek();
  const covered = useCovered();
  const tonight = useTonight();
  const planning = useLivePlan();
  const cook = useCookFlow();
  const place = usePlaceFlow();
  const list = useMemo(() => {
    if (mode === "prep") return proposals(chosen, prefs, ctx, covered, 6);
    return proposals({}, prefs, { plan: [], pool: ctx.pool.filter((m) => m.title !== tonight?.title) }, covered, 6);
  }, [chosen, prefs, ctx, covered, mode, tonight]);
  if (status !== "ready" || list.length === 0) return null;
  return (
    <section aria-labelledby="sugg" className="mt-10">
      <h2 id="sugg" className="text-[20px]">Suggested meals</h2>
      <p className="mb-4 mt-1 text-[14px] text-muted-foreground">{mode === "prep" ? "They fit your settings and reuse what your week already buys." : "They fit your settings, ranked by what is in your fridge."}</p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {list.map((m) => {
          const have = m.uses.filter(covered).length;
          return (
            <li key={m.title} className="flex flex-col overflow-hidden rounded-sheet bg-sheet">
              <img src={imageOf(m)} alt="" width={300} height={200} loading="lazy" className="h-28 w-full object-cover" />
              <div className="flex flex-1 flex-col p-3">
                {m.slug ? <Link to="/recipe/$slug" params={{ slug: m.slug }} className="line-clamp-2 text-[14.5px] font-bold leading-snug hover:underline">{m.title}</Link> : <p className="text-[14.5px] font-bold">{m.title}</p>}
                <p className="num mt-0.5 text-[12.5px] text-muted-foreground">{m.minutes ?? 20} min · {eur(planning.priceOf(m))}{have ? ` · ${have} at home` : ""}</p>
                <div className="mt-auto flex flex-col gap-1.5 pt-3">
                  <Button variant="secondary" className="min-h-9 text-[13px]" onClick={() => place.add(m)}>{mode === "prep" ? "Add to plan" : "Pick for tonight"}</Button>
                  {mode === "daily" && <Button className="min-h-9 text-[13px]" onClick={() => cook.start(m)}>Start cooking</Button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {place.dialogs}{cook.dialogs}
    </section>
  );
}

type DealRow = { key: string; store: StoreName; deal: Deal; base: string; name: string; recipes: Meal[] };

/** The best real deals at the person's stores, for ingredients we have recipes for. */
function TopDeals() {
  const { stores, mode } = useApp();
  const live = useLiveDeals().data;
  const ings = useIngredients();
  const { ctx, prefs, status } = useWeek();
  const covered = useCovered();
  const planned = usePlanned();
  const place = usePlaceFlow();
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo<DealRow[]>(() => {
    if (!live || !ings.data || status !== "ready") return [];
    const bySlug = new Map(ings.data.map((i) => [i.slug, i]));
    const byId = new Map(ings.data.map((i) => [i.id, i]));
    const fitting = ctx.pool.filter((m) => fitsPrefs(m, prefs));
    const out: DealRow[] = [];
    for (const st of stores) for (const d of live[st] ?? []) {
      if (!d.slug || !isRealDeal(d)) continue;
      const ing = bySlug.get(d.slug);
      const parent = ing?.parent_id ? byId.get(ing.parent_id) : undefined;
      const base = parent?.slug ?? d.slug;
      const recipes = fitting.filter((m) => m.uses.includes(base));
      if (recipes.length) out.push({ key: `${st}-${d.id ?? d.name}`, store: st, deal: d, base, name: (parent ?? ing)?.name ?? base, recipes });
    }
    return out.sort((a, b) => realSaving(b.deal) - realSaving(a.deal)).slice(0, 6);
  }, [live, ings.data, status, ctx.pool, prefs, stores]);
  if (rows.length === 0) {
    const why = !live || !ings.data || status === "loading" ? "Loading this week's deals…"
      : status !== "ready" ? "Deals show once there are dinners that fit your diet and allergies."
      : "No promotion at your stores this week matches an ingredient we have a fitting recipe for. See all deals for everything on offer.";
    return (
      <section aria-labelledby="deals" className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="deals" className="text-[20px]">Top deals at your stores</h2>
          <Link to="/deals" className="text-[14.5px] font-medium underline underline-offset-4">All deals</Link>
        </div>
        <p role="status" className="rounded-sheet bg-sheet p-4 text-[14.5px] text-muted-foreground">{why}</p>
      </section>
    );
  }
  const weekTitles = new Set(planned.map((c) => c.meal.title));
  return (
    <section aria-labelledby="deals" className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="deals" className="text-[20px]">Top deals at your stores</h2>
        <Link to="/deals" className="text-[14.5px] font-medium underline underline-offset-4">All deals</Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const usedBy = planned.filter((c) => c.meal.uses.includes(r.base));
          const atHome = covered(r.base);
          const options = r.recipes.filter((m) => !weekTitles.has(m.title)).slice(0, 4);
          return (
            <li key={r.key} className="flex flex-col overflow-hidden rounded-sheet bg-sheet">
              <div className="flex gap-3 p-4">
                <img src={dealPhoto(r.deal.photoKey ?? r.deal.name)} alt="" width={80} height={80} loading="lazy" className="size-16 shrink-0 rounded-[8px] object-cover" />
                <div className="min-w-0 flex-1">
                  <StoreBadge name={r.store} className="h-6 px-2" />
                  <h3 className="mt-1 line-clamp-2 text-[15.5px] font-bold leading-snug">{r.deal.name}</h3>
                  <p className="num text-[13.5px]"><span className="font-bold">{eur(r.deal.price)}</span> <span className="text-muted-foreground line-through">{eur(r.deal.was)}</span> <span className="text-basil">−{eur(realSaving(r.deal))}</span></p>
                </div>
              </div>
              <div className="mt-auto border-t border-rule px-4 py-3">
                <Button variant="secondary" className="min-h-10 w-full" aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? null : r.key)}>Include in a recipe</Button>
                {open === r.key && (
                  <div className="slide-in mt-3 space-y-3">
                    {(usedBy.length > 0 || atHome) && (
                      <p className="rounded-[6px] bg-basil-tint px-3 py-2 text-[13px] text-basil">
                        {usedBy.length > 0 ? `Already in your plan: ${usedBy.map((c) => `${c.meal.title} (${c.day})`).join(", ")}.` : ""}
                        {atHome ? ` You already have ${r.name.toLowerCase()} at home.` : ""}
                      </p>
                    )}
                    {options.length === 0 ? <p className="text-[13.5px] text-muted-foreground">Every recipe with {r.name.toLowerCase()} that fits you is already planned.</p> : (
                      <ul className="space-y-2">
                        {options.map((m) => (
                          <li key={m.title} className="flex items-center justify-between gap-2">
                            {m.slug ? <Link to="/recipe/$slug" params={{ slug: m.slug }} className="min-w-0 text-[14px] font-medium hover:underline">{m.title}</Link> : <span className="text-[14px] font-medium">{m.title}</span>}
                            <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[13px]" onClick={() => place.add(m)}>{mode === "prep" ? "Add to plan" : "Pick for tonight"}</Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {place.dialogs}
    </section>
  );
}
