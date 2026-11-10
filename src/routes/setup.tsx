import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { stores } from "@/data/stores";
import { dietOptions, mealOptions } from "@/data/plan";
import { Button } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setup")({
  head: pageHead("Your meals", "Pick what you eat, the meals you like and where you shop."),
  component: Setup,
});

function Toggle({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-ctl px-4 text-left text-[15px] font-medium", on ? "bg-ink text-sheet" : "bg-sheet-2 text-ink hover:bg-rule", className)}>
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
    <div className="max-w-[720px]">
      <p className="text-[13px] font-medium text-muted-foreground">Set up · 2 minutes</p>
      <h1 className="mt-1 text-[26px] md:text-[30px]">Your 12 favourite meals, rotated around the deals</h1>
      <p className="mt-2 pb-6 text-muted-foreground">Pick what you eat and what you like. We build every plan from this short list instead of thousands of recipes.</p>

      <Block n={1} title="What do you eat?">
        <div className="flex flex-wrap gap-2">
          {dietOptions.map((d) => <Toggle key={d} on={s.diet.includes(d)} onClick={() => s.set({ diet: toggleIn(s.diet, d) })}>{d}</Toggle>)}
        </div>
      </Block>

      <Block n={2} title="Which meals do you like?" aside={<span className="num text-[13px] text-muted-foreground" aria-live="polite">{s.meals.length} of 12</span>}>
        <div className="flex flex-wrap gap-2">
          {mealOptions.map((m) => {
            const on = s.meals.includes(m);
            return <Toggle key={m} on={on} onClick={() => {
              if (!on && s.meals.length >= 12) { toast("You have 12 meals. Remove one first."); return; }
              s.set({ meals: toggleIn(s.meals, m) });
            }}>{m}</Toggle>;
          })}
        </div>
      </Block>

      <Block n={3} title="Where do you usually shop?">
        <div className="flex flex-wrap gap-2">
          {stores.map((st) => <Toggle key={st} on={s.store === st} onClick={() => s.set({ store: st })}>{st}</Toggle>)}
        </div>
      </Block>

      <Block n={4} title="How do you want to cook?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle className="py-3" on={s.mode === "prep"} onClick={() => s.set({ mode: "prep" })}>
            <span className="block font-semibold">Weekly prep</span>
            <span className="block text-[13px] opacity-80">Cook a base twice a week, eat something different each day.</span>
          </Toggle>
          <Toggle className="py-3" on={s.mode === "daily"} onClick={() => s.set({ mode: "daily" })}>
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
