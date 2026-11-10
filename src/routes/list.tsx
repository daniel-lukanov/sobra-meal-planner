import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { shoppingList } from "@/data/list";
import { Button, PageHeader, TwoCol } from "@/components/sobra/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/list")({
  head: pageHead("Shopping list", "Your shopping list sorted by aisle, without what is already in your fridge."),
  component: List,
});

function List() {
  const { store, checked, set } = useApp();
  return (
    <>
      <PageHeader small={`Monday to Wednesday · ${store}`} title="Shopping list sorted by aisle"
        sub="Only what is missing. Onions and rice are already in your fridge, so they are crossed out."
        right={<div className="md:text-right"><p className="num text-[22px] font-bold">€14.23</p><p className="num text-[13px] text-muted-foreground">8 items · <span className="text-basil">€6.85 below regular prices</span></p></div>} />
      <TwoCol
        main={
          <div className="space-y-6">
            {shoppingList.map((g) => (
              <section key={g.aisle} aria-labelledby={`a-${g.aisle}`}>
                <h2 id={`a-${g.aisle}`} className="border-b border-rule pb-2 text-[18px]">{g.aisle}</h2>
                <ul className="divide-y divide-rule">
                  {g.items.map((it) => {
                    const on = it.inFridge || !!checked[it.id];
                    return (
                      <li key={it.id}>
                        <label className={cn("flex min-h-14 items-center gap-3", it.inFridge ? "cursor-default" : "cursor-pointer")}>
                          <input type="checkbox" className="peer sr-only" checked={on} disabled={it.inFridge}
                            onChange={(e) => set({ checked: { ...checked, [it.id]: e.target.checked } })} />
                          <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-chip border-2 transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-basil", on ? "border-basil bg-basil text-basil-ink" : "border-rule")}>
                            {on && <Check className="size-4" strokeWidth={3} />}
                          </span>
                          <span className={cn("flex-1 text-[15.5px] decoration-1 transition-colors duration-200 ease-kitchen", on ? "text-muted-foreground line-through decoration-current" : "line-through decoration-transparent")}>{it.name}</span>
                          <span className="num text-[15px] text-muted-foreground">{it.inFridge ? "in fridge" : eur(it.price ?? 0)}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        }
        side={
          <section aria-labelledby="tired">
            <h2 id="tired" className="text-[18px]">Too tired to shop?</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Send this list to an online supermarket, or order dinner tonight and keep the plan for tomorrow.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => toast("Coming later: send the list to Continente Online or Glovo.")}>Send list to online shop</Button>
              <Button variant="secondary" onClick={() => toast("Coming later: order through a delivery app for tonight.")}>Order dinner tonight</Button>
            </div>
          </section>
        }
      />
    </>
  );
}
