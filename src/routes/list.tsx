import { createFileRoute } from "@tanstack/react-router";
import { Beef, Carrot, Check, Egg, Package, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { Button, PageHeader } from "@/components/sobra/ui";
import { useExp } from "@/lib/experiment";
import { COMING_SOON, listTotal } from "@/lib/week";
import { useWeek } from "@/lib/use-week";
import { useLivePlan } from "@/lib/live-plan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/list")({
  head: pageHead("Shopping list", "Your shopping list for the week, sorted by aisle, without what is already in your fridge."),
  component: List,
});

const aisleIcon: Record<string, LucideIcon> = { "Fruit and veg": Carrot, "Meat and fish": Beef, "Eggs and dairy": Egg, Pantry: Package };

function List() {
  const { store, checked, chosen, set } = useApp();
  const [delivery, setDelivery] = useState(false);
  const planning = useLivePlan();
  const { cards } = useWeek();
  const items = planning.items(cards);
  const aisles = [...new Set(items.map((i) => i.aisle))];
  const toBuy = items.filter((i) => !i.inFridge);
  return (
    <>
      <PageHeader small={`Prices from ${store}`} title="Your shopping list" sub="Only what your dinners need. Things already in your fridge are crossed out." />
      <section aria-label="List total" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-sheet bg-sheet p-5">
        <div className="num">
          <p className="text-[26px] font-bold leading-none">{eur(listTotal(items))}</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{toBuy.length} items to buy. {planning.listNote(cards)}</p>
        </div>
        <div>
          <Button variant="secondary" onClick={() => { useExp.getState().track("fake_door_delivery"); setDelivery(true); }}>Order groceries for tonight (coming soon)</Button>
          {delivery && <p role="status" className="mt-2 max-w-sm text-[13.5px] text-muted-foreground">{COMING_SOON}</p>}
        </div>
      </section>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {aisles.map((aisle) => {
          const Icon = aisleIcon[aisle] ?? Package;
          return (
            <section key={aisle} aria-labelledby={`a-${aisle}`} className="card p-5">
              <h2 id={`a-${aisle}`} className="mb-3 flex items-center gap-2.5 text-[18px]">
                <span className="flex size-9 items-center justify-center rounded-[8px] bg-basil-tint text-basil"><Icon className="size-[18px]" strokeWidth={1.7} aria-hidden /></span>{aisle}
              </h2>
              <ul>
                {items.filter((i) => i.aisle === aisle).map((it) => {
                  const on = it.inFridge || !!checked[it.id];
                  return (
                    <li key={it.id} className="mb-2 rounded-[8px] bg-row">
                      <label className={cn("flex min-h-12 items-center justify-between gap-3 p-3", it.inFridge ? "cursor-default" : "cursor-pointer")}>
                        <input type="checkbox" className="peer sr-only" checked={on} disabled={it.inFridge}
                          onChange={(e) => set({ checked: { ...checked, [it.id]: e.target.checked } })} />
                        <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-chip border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-basil", on ? "border-basil bg-basil text-basil-ink" : "border-rule bg-sheet")}>
                          {on && <Check className="size-4" strokeWidth={3} />}
                        </span>
                        <span className="flex-1">
                          <span className={cn("block text-[15px] font-medium", on && "text-muted-foreground line-through")}>{it.name}</span>
                          <span className="block text-[12.5px] text-muted-foreground">for {it.dinners} {it.dinners === 1 ? "dinner" : "dinners"}{it.note ? `. ${it.note}` : ""}</span>
                        </span>
                        <span className="num text-[14.5px] text-muted-foreground">{it.inFridge ? "in fridge" : eur(it.price ?? 0)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
