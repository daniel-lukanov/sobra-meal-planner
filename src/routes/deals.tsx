import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, BellRing, ShieldAlert } from "lucide-react";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { dealsByStore, isRealDeal, realSaving } from "@/data/deals";
import { dealPhoto } from "@/data/photos";
import { PageHeader } from "@/components/sobra/ui";
import { Switch } from "@/components/ui/switch";
import { useExp } from "@/lib/experiment";
import { cn } from "@/lib/utils";

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
  const deals = [...dealsByStore[store]].sort((a, b) => Number(isRealDeal(b)) - Number(isRealDeal(a)));
  const traps = deals.filter((d) => !isRealDeal(d)).length;
  const firstTrap = deals.find((d) => !isRealDeal(d))?.name;
  return (
    <>
      <PageHeader small={`${deals.length} offers this week · ${traps} price ${traps === 1 ? "trap" : "traps"} flagged`} title={`Deals at ${store}, checked against regular prices`}
        sub="A deal only counts when it beats the cheapest regular alternative, not just its own crossed-out price." />
      <ul className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {deals.map((d) => {
          const real = isRealDeal(d);
          return (
            <li key={d.name} data-tour={d.name === firstTrap ? "3" : undefined} className="flex flex-col overflow-hidden rounded-sheet border-[1.5px] border-ink bg-sheet">
              <div className="relative h-36 bg-sheet-2">
                <img src={dealPhoto(d.name)} alt="" width={600} height={288} loading="lazy" className="size-full object-cover" />
                <span className={cn("absolute left-3 top-3 inline-flex items-center gap-1 rounded-[3px] px-2.5 py-1 text-[12px] font-semibold", real ? "bg-sheet text-basil" : "bg-sheet text-tomato")}>
                  {real ? <BadgeCheck className="size-3.5" aria-hidden /> : <ShieldAlert className="size-3.5" aria-hidden />}{real ? "Verified deal" : "Price trap"}
                </span>
              </div>
              <div className="flex flex-1 items-end justify-between gap-3 p-4">
                <h2 className="text-[18px] font-bold">{d.name}</h2>
                <p className="num shrink-0 text-right">
                  <span className={cn("block text-[20px] font-bold", !real && "text-tomato")}>{eur(d.price)}</span>
                  <span className="text-[12.5px] text-muted-foreground line-through"><span className="sr-only">was </span>{eur(d.was)}</span>
                </p>
              </div>
              <p className={cn("num px-4 py-2.5 text-[13px] font-semibold", real ? "bg-basil-tint text-basil" : "bg-tomato-tint text-tomato")}>
                {real ? `Real saving: ${eur(realSaving(d))} below regular option` : `Price trap: regular ${d.name.match(/mince|salmon|pesto|carrots/i)?.[0].toLowerCase() ?? "version"} is ${eur(d.cheapestRegular)}`}
              </p>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="pa" data-tour="3" data-tour-auto className="p-1">
        <h2 id="pa" className="flex items-center gap-2 text-[20px] font-bold"><BellRing className="size-5 text-basil" aria-hidden />Price alerts</h2>
        <p className="mb-4 mt-1 text-[13.5px] text-muted-foreground">We tell you when a product you buy often drops below your usual price.</p>
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {alertItems.map((a) => (
            <li key={a.id} className="card flex min-h-16 items-center justify-between gap-3 p-4">
              <label htmlFor={`al-${a.id}`} className="flex-1 cursor-pointer">
                <span className="block text-[15.5px] font-semibold">{a.name}</span>
                <span className="num block text-[13px] text-muted-foreground">usual {eur(a.usual)}</span>
              </label>
              <Switch data-tour-trigger id={`al-${a.id}`} checked={!!alerts[a.id]} className="data-[state=checked]:bg-basil data-[state=unchecked]:bg-rule"
                onCheckedChange={(v) => { set({ alerts: { ...alerts, [a.id]: v } }); useExp.getState().track("task_3_deals"); toast(v ? "Alert on. We tell you when it drops." : "Alert off."); }} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
