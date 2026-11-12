import { createFileRoute } from "@tanstack/react-router";
import { Beef, Carrot, Check, Egg, Package, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { shoppingList } from "@/data/list";
import { Button, PageHeader } from "@/components/sobra/ui";
import { useExp } from "@/lib/experiment";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/list")({
  head: pageHead("Shopping list", "Your shopping list sorted by aisle, without what is already in your fridge."),
  component: List,
});

const aisleIcon: Record<string, LucideIcon> = { "Fruit and veg": Carrot, "Meat and fish": Beef, "Eggs and dairy": Egg, Pantry: Package };

function List() {
  const { store, checked, set } = useApp();
  return (
    <>
      <PageHeader small={`Monday to Wednesday · ${store}`} title="Shopping list sorted by aisle"
        sub="Only what is missing. Onions and rice are already in your fridge, so they are crossed out." />
      <section aria-label="List total" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-sheet border-[1.5px] border-ink bg-sheet p-5">
        <div className="num">
          <p className=" text-[26px] font-bold leading-none">€14.23</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">8 items · <span className="font-semibold text-basil">€6.85 saved vs regular prices</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast("Coming later: send the list to Continente Online or Glovo.")}>Send list to online shop</Button>
          <Button variant="secondary" onClick={() => toast("Coming later: order through a delivery app for tonight.")}>Order dinner tonight</Button>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {shoppingList.map((g) => {
          const Icon = aisleIcon[g.aisle] ?? Package;
          return (
            <section key={g.aisle} aria-labelledby={`a-${g.aisle}`} data-tour={g.aisle === "Fruit and veg" ? "4" : undefined} data-tour-auto className="card p-5">
              <h2 id={`a-${g.aisle}`} className="mb-3 flex items-center gap-2.5 text-[18px]">
                <span className="flex size-9 items-center justify-center rounded-[4px] bg-basil-tint text-basil"><Icon className="size-[18px]" strokeWidth={1.7} aria-hidden /></span>{g.aisle}
              </h2>
              <ul>
                {g.items.map((it) => {
                  const on = it.inFridge || !!checked[it.id];
                  return (
                    <li key={it.id} className="mb-2 rounded-[4px] bg-row">
                      <label className={cn("flex min-h-12 items-center justify-between gap-3 p-3", it.inFridge ? "cursor-default" : "cursor-pointer")}>
                        <input type="checkbox" className="peer sr-only" checked={on} disabled={it.inFridge}
                          onChange={(e) => { set({ checked: { ...checked, [it.id]: e.target.checked } }); if (e.target.checked) useExp.getState().track("task_4_list"); }} />
                        <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-chip border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-basil", on ? "border-basil bg-basil text-basil-ink" : "border-rule bg-sheet")}>
                          {on && <Check className="size-4" strokeWidth={3} />}
                        </span>
                        <span className={cn("flex-1 text-[15px] font-medium", on && "text-muted-foreground line-through")}>{it.name}</span>
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
