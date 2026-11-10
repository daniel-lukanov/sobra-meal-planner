import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { dealsByStore, isRealDeal, realSaving } from "@/data/deals";
import { ingredientColors } from "@/data/ingredients";
import { Chip, Dot, PageHeader, TwoCol } from "@/components/sobra/ui";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/deals")({
  head: pageHead("Deals", "This week's supermarket deals, checked against the cheapest regular prices."),
  component: Deals,
});

const alertItems = [
  { id: "potatoes", name: "Potatoes", usual: 2.99 },
  { id: "chicken", name: "Chicken", usual: 4.69 },
  { id: "eggs", name: "Eggs", usual: 3.19 },
];

function Deals() {
  const { store, alerts, set } = useApp();
  const deals = dealsByStore[store];
  return (
    <>
      <PageHeader small={`${deals.length} offers this week`} title={`Deals at ${store}, checked against regular prices`}
        sub="A deal only counts when it is cheaper than the cheapest regular alternative, not just cheaper than its own crossed-out price." />
      <TwoCol
        main={
          <ul className="divide-y divide-rule border-y border-rule">
            {deals.map((d) => {
              const real = isRealDeal(d);
              return (
                <li key={d.name} className="flex items-center gap-3 py-4">
                  <Dot color={d.ingredient ? ingredientColors[d.ingredient] : "var(--rule)"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-medium">{d.name}</p>
                    {real ? <Chip tone="basil" className="mt-1">Real saving {eur(realSaving(d))}</Chip>
                      : <Chip tone="tomato" className="mt-1">Not a real deal: regular alternative {eur(d.cheapestRegular)}</Chip>}
                  </div>
                  <div className="num text-right">
                    <p className="text-[15.5px] font-semibold">{eur(d.price)}</p>
                    <p className="text-[12px] text-muted-foreground line-through"><span className="sr-only">was </span>{eur(d.was)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        }
        side={
          <section aria-labelledby="pa">
            <h2 id="pa" className="text-[18px]">Price alerts</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">We tell you when a product you buy often drops below your usual price.</p>
            <ul className="mt-3 divide-y divide-rule">
              {alertItems.map((a) => (
                <li key={a.id} className="flex min-h-14 items-center justify-between gap-3">
                  <label htmlFor={`al-${a.id}`} className="flex-1 cursor-pointer">
                    <span className="block text-[15px] font-medium">{a.name}</span>
                    <span className="num block text-[13px] text-muted-foreground">usual {eur(a.usual)}</span>
                  </label>
                  <Switch id={`al-${a.id}`} checked={!!alerts[a.id]} className="data-[state=checked]:bg-basil data-[state=unchecked]:bg-rule"
                    onCheckedChange={(v) => { set({ alerts: { ...alerts, [a.id]: v } }); toast(v ? "Alert on. We tell you when it drops." : "Alert off."); }} />
                </li>
              ))}
            </ul>
          </section>
        }
      />
    </>
  );
}
