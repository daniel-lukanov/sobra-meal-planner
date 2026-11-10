import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { stores } from "@/data/stores";
import { dietOptions, mealOptions } from "@/data/plan";
import { Button } from "@/components/sobra/ui";
import { StoreBadge } from "@/components/sobra/Brand";
import { categoryPhoto } from "@/data/photos";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  head: pageHead("Your meals", "Pick what you eat, the meals you like and where you shop."),
  component: Setup,
});

function Toggle({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-full px-4 text-left text-[15px] font-medium", on ? "bg-ink text-sheet" : "bg-sheet-2 text-ink hover:bg-sheet-hover", className)}>
      {children}
    </button>
  );
}

function Block({ n, title, aside, children }: { n: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-6" aria-labelledby={`b${n}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id={`b${n}`} className="text-[18px]"><span className="num mr-2 text-muted-foreground">{n}</span>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Setup() {
  const s = useApp();
  const navigate = useNavigate();
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="mx-auto max-w-[860px]">
      <p className="text-[13px] font-medium text-muted-foreground">Set up · 2 minutes</p>
      <h1 className="mt-1 text-[28px] font-bold md:text-[36px]">Your 12 favourite meals, rotated around the deals</h1>
      <p className="mt-2 pb-6 text-muted-foreground">Pick what you eat and what you like. We build every plan from this short list instead of thousands of recipes.</p>

      <Block n={1} title="What do you eat?">
        <div className="flex flex-wrap gap-2">
          {dietOptions.map((d) => <Toggle key={d} on={s.diet.includes(d)} onClick={() => s.set({ diet: toggleIn(s.diet, d) })}>{d}</Toggle>)}
        </div>
      </Block>

      <Block n={2} title="Which meals do you like?" aside={<span className="num text-[13px] text-muted-foreground" aria-live="polite">{s.meals.length} of 12</span>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {mealOptions.map((m) => {
            const on = s.meals.includes(m);
            return (
              <button key={m} type="button" aria-pressed={on} onClick={() => {
                if (!on && s.meals.length >= 12) { toast("You have 12 meals. Remove one first."); return; }
                s.set({ meals: toggleIn(s.meals, m) });
              }} className={cn("card press group relative overflow-hidden p-2 text-left", on && "border-basil shadow-[0_0_0_1px_var(--basil)]")}>
                <div className="aspect-[4/3] overflow-hidden rounded-[10px] bg-sheet-2">
                  <img src={categoryPhoto[m]} alt="" width={300} height={225} loading="lazy" className={cn("size-full object-cover transition", !on && "opacity-80 saturate-[.8]")} />
                </div>
                <span className={cn("absolute right-3.5 top-3.5 flex size-7 items-center justify-center rounded-full transition", on ? "bg-basil text-basil-ink" : "bg-sheet/90 text-muted-foreground")} aria-hidden>
                  {on ? <Check className="size-4" strokeWidth={2.4} /> : <span className="size-3 rounded-full ring-2 ring-current" />}
                </span>
                <span className="mt-2 block px-1 pb-0.5 font-serif text-[16px] font-semibold">{m}</span>
              </button>
            );
          })}
        </div>
      </Block>

      <Block n={3} title="Where do you usually shop?">
        <div className="flex flex-wrap gap-2">
          {stores.map((st) => {
            const on = s.store === st;
            return (
              <button key={st} type="button" aria-pressed={on} onClick={() => s.set({ store: st })}
                className={cn("press min-h-11 rounded-full p-1 ring-2", on ? "ring-ink" : "ring-transparent hover:ring-rule")}>
                <StoreBadge name={st} className="min-h-9 px-3.5 text-[14.5px]" />
              </button>
            );
          })}
        </div>
      </Block>

      <Block n={4} title="How do you want to cook?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle className="rounded-[14px] py-3" on={s.mode === "prep"} onClick={() => s.set({ mode: "prep" })}>
            <span className="block font-semibold">Weekly prep</span>
            <span className="block text-[13px] opacity-80">Cook a base twice a week, eat something different each day.</span>
          </Toggle>
          <Toggle className="rounded-[14px] py-3" on={s.mode === "daily"} onClick={() => s.set({ mode: "daily" })}>
            <span className="block font-semibold">Daily pick</span>
            <span className="block text-[13px] opacity-80">Choose 1 of 3 quick dinners each evening, about 20 to 30 min.</span>
          </Toggle>
        </div>
      </Block>

      <div className="border-t border-rule pt-6">
        <Button onClick={() => {
          s.set({ setupDone: true });
          navigate({ to: "/plan" });
          toast(`Week built from your ${s.meals.length} meals and ${s.store} deals.`);
        }}>Build my first week</Button>
      </div>
    </div>
  );
}
