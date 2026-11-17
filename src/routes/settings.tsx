import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { stores } from "@/data/stores";
import { mealOptions } from "@/data/plan";
import { ALLERGENS, ALL_PROTEINS, GOALS, INTOLERANCES, PROTEINS, type Lifestyle } from "@/lib/prefs";
import { StoreBadge } from "@/components/pratico/Brand";
import { categoryPhoto } from "@/data/photos";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: pageHead("Settings", "Your supermarkets, what you eat, what you avoid and what you want from your dinners."),
  component: Settings,
});

function Toggle({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-[6px] px-4 text-left text-[15px] font-medium", on ? "bg-ink text-sheet" : "bg-sheet-2 text-ink hover:bg-sheet-hover", className)}>
      {children}
    </button>
  );
}

function Block({ id, title, hint, aside, children }: { id: string; title: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-6" aria-labelledby={id}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 id={id} className="text-[18px]">{title}</h2>
          {hint && <p className="mt-1 text-[13.5px] text-muted-foreground">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Settings() {
  const s = useApp();
  // A change to stores or food makes the saved week out of date, so the plan is rebuilt from the new settings.
  const change = (p: Partial<typeof s>) => s.set({ ...p, chosen: {}, weekAccepted: false });
  const veg = s.lifestyle !== "none";
  const setLifestyle = (l: Lifestyle) => change({ lifestyle: l, proteins: l === "none" ? ALL_PROTEINS : [] });
  const allergyCodes = new Set<string>(ALLERGENS.map((a) => a.code));

  return (
    <div className="mx-auto max-w-[860px]">
      <p className="text-[13px] font-medium text-muted-foreground">Settings</p>
      <h1 className="mt-1 text-[28px] font-bold md:text-[36px]">Your settings</h1>
      <p className="mt-2 pb-6 text-muted-foreground">Change anything at any time. Your plan updates to match.</p>

      <Block id="stores" title="Where do you shop?" hint="Pick one or more. Each item is priced at the cheapest of your stores, and the shopping list is grouped by store.">
        <div className="flex flex-wrap gap-2">
          {stores.map((st) => {
            const on = s.stores.includes(st);
            return (
              <button key={st} type="button" aria-label={st} aria-pressed={on} onClick={() => {
                if (on && s.stores.length === 1) { toast("Keep at least one store."); return; }
                change({ stores: on ? s.stores.filter((x) => x !== st) : [...s.stores, st] });
              }} className={cn("press min-h-11 rounded-full p-1 ring-2", on ? "ring-ink" : "ring-transparent hover:ring-rule")}>
                <StoreBadge name={st} className="h-9 px-3" />
              </button>
            );
          })}
        </div>
      </Block>

      <Block id="eat" title="What do you eat?">
        <div className="flex flex-wrap gap-2">
          <Toggle on={s.lifestyle === "none"} onClick={() => setLifestyle("none")}>I eat animal products</Toggle>
          <Toggle on={s.lifestyle === "vegetarian"} onClick={() => setLifestyle("vegetarian")}>Vegetarian</Toggle>
          <Toggle on={s.lifestyle === "vegan"} onClick={() => setLifestyle("vegan")}>Vegan</Toggle>
        </div>
        <p className="mt-5 mb-2 text-[14px] font-semibold">Animal proteins you eat</p>
        <div className="flex flex-wrap gap-2" aria-disabled={veg}>
          {PROTEINS.map((p) => (
            <Toggle key={p.code} on={!veg && s.proteins.includes(p.code)} className={veg ? "pointer-events-none opacity-50" : ""}
              onClick={() => change({ proteins: toggleIn(s.proteins, p.code) })}>{p.label}</Toggle>
          ))}
        </div>
        {veg && <p className="mt-2 text-[13.5px] text-muted-foreground">{s.lifestyle === "vegan" ? "Vegan: no meat, fish, eggs or dairy." : "Vegetarian: no meat or fish. Eggs and dairy are fine."}</p>}
      </Block>

      <Block id="allergies" title="Allergies and intolerances" hint="We never show a dinner that contains one of these.">
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => <Toggle key={a.code} on={s.allergens.includes(a.code)} onClick={() => change({ allergens: toggleIn(s.allergens, a.code) })}>{a.label}</Toggle>)}
          {INTOLERANCES.filter((i) => !allergyCodes.has(i.code) || i.code !== "gluten").map((i) => <Toggle key={i.code} on={s.allergens.includes(i.code)} onClick={() => change({ allergens: toggleIn(s.allergens, i.code) })}>{i.label}</Toggle>)}
        </div>
        <p className="mt-3 text-[13.5px] text-muted-foreground">Always check the label of what you buy. Product recipes and brands change, and we match on ingredients, not on the packaging.</p>
      </Block>

      <Block id="goals" title="What do you want from your dinners?" hint="Pick any. These rank dinners, they never hide the ones that fit your food choices.">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => <Toggle key={g.code} on={s.goals.includes(g.code)} onClick={() => change({ goals: toggleIn(s.goals, g.code) })}>{g.label}</Toggle>)}
        </div>
      </Block>

      <Block id="mode" title="How do you want to cook?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle className="rounded-[8px] py-3" on={s.mode === "prep"} onClick={() => s.set({ mode: "prep" })}>
            <span className="block font-semibold">Weekly prep</span>
            <span className="block text-[13px] opacity-80">Cook a base twice a week, eat something different each day.</span>
          </Toggle>
          <Toggle className="rounded-[8px] py-3" on={s.mode === "daily"} onClick={() => s.set({ mode: "daily" })}>
            <span className="block font-semibold">Daily pick</span>
            <span className="block text-[13px] opacity-80">Choose 1 of 3 quick dinners each evening, about 20 to 30 min.</span>
          </Toggle>
        </div>
      </Block>

      <Block id="meals" title="Which meals do you like?" aside={<span className="num text-[13px] text-muted-foreground" aria-live="polite">{s.meals.length} of 12</span>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {mealOptions.map((m) => {
            const on = s.meals.includes(m);
            return (
              <button key={m} type="button" aria-pressed={on} onClick={() => {
                if (!on && s.meals.length >= 12) { toast("You have 12 meals. Remove one first."); return; }
                change({ meals: toggleIn(s.meals, m) });
              }} className={cn("card press group relative overflow-hidden p-2 text-left", on && "border-basil")}>
                <div className="aspect-[4/3] overflow-hidden rounded-[8px] bg-sheet-2">
                  <img src={categoryPhoto[m]} alt="" width={300} height={225} loading="lazy" className={cn("size-full object-cover transition", !on && "opacity-80 saturate-[.8]")} />
                </div>
                <span className={cn("absolute right-3.5 top-3.5 flex size-7 items-center justify-center rounded-full transition", on ? "bg-basil text-basil-ink" : "bg-sheet/90 text-muted-foreground")} aria-hidden>
                  {on ? <Check className="size-4" strokeWidth={2.4} /> : <span className="size-3 rounded-full ring-2 ring-current" />}
                </span>
                <span className="mt-2 block px-1 pb-0.5 text-[16px] font-semibold">{m}</span>
              </button>
            );
          })}
        </div>
      </Block>

      <div className="border-t border-rule pt-6">
        <Link to="/plan" className="inline-flex min-h-11 items-center rounded-ctl bg-basil px-5 text-[15px] font-semibold text-basil-ink">See my plan</Link>
      </div>
    </div>
  );
}
