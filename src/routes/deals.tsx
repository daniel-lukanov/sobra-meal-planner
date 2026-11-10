import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { dealsByStore, isRealDeal, realSaving } from "@/data/deals";
import { ingredientColors } from "@/data/ingredients";
import { Chip, Dot, PageHeader, TwoCol } from "@/components/sobra/ui";
import { Switch } from "@/components/ui/switch";
import { StoreBadge } from "@/components/sobra/Brand";
import { BadgeCheck, ShieldAlert } from "lucide-react";

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
  const real = deals.filter(isRealDeal);
  const traps = deals.filter((d) => !isRealDeal(d));
  return (
    <>
      <div className="mb-4"><StoreBadge name={store} /></div>
      <PageHeader small={`${deals.length} offers this week`} title={`Deals at ${store}, checked against regular prices`}
        sub="A deal only counts when it is cheaper than the cheapest regular alternative, not just cheaper than its own crossed-out price." />
      <TwoCol
        main={
          <div className="space-y-8">
            <section aria-labelledby="real">
              <h2 id="real" className="flex items-center gap-2 text-[20px] font-bold"><BadgeCheck className="size-5 text-basil" aria-hidden />Verified real deals</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Cheaper than the cheapest normal product on the shelf.</p>
              <ul className="mt-3 space-y-2.5">
                {real.map((d) => (
                  <li key={d.name} className="card flex items-center gap-3 p-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sheet-2"><Dot color={d.ingredient ? ingredientColors[d.ingredient] : "var(--muted)"} className="size-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15.5px] font-semibold">{d.name}</p>
                      <Chip tone="basil" className="mt-1 num">You save {eur(realSaving(d))} vs {eur(d.cheapestRegular)} normal</Chip>
                    </div>
                    <div className="num text-right">
                      <p className="font-serif text-[18px] font-bold">{eur(d.price)}</p>
                      <p className="text-[12px] text-muted-foreground line-through"><span className="sr-only">was </span>{eur(d.was)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            {traps.length > 0 && (
              <section aria-labelledby="traps">
                <h2 id="traps" className="flex items-center gap-2 text-[20px] font-bold"><ShieldAlert className="size-5 text-tomato" aria-hidden />Price traps we filtered out</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">Big crossed-out price, but the normal version costs less.</p>
                <ul className="mt-3 space-y-2.5">
                  {traps.map((d) => (
                    <li key={d.name} className="flex items-center gap-3 rounded-[16px] bg-tomato-tint p-3.5">
                      <ShieldAlert className="size-5 shrink-0 text-tomato" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] font-semibold">{d.name}</p>
                        <p className="num text-[13px]">The regular one is {eur(d.cheapestRegular)}, so this costs you {eur(d.price - d.cheapestRegular)} more.</p>
                      </div>
                      <div className="num text-right">
                        <p className="font-serif text-[18px] font-bold text-tomato">{eur(d.price)}</p>
                        <p className="text-[12px] text-muted-foreground line-through"><span className="sr-only">was </span>{eur(d.was)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        }
        side={
          <section aria-labelledby="pa" className="card p-5">
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
