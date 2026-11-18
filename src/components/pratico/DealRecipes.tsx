import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { useWeek } from "@/lib/use-week";
import { fitsPrefs } from "@/lib/prefs";
import { useIngredients } from "@/lib/db-queries";
import { eur } from "@/lib/store";
import { mealPhoto, photo } from "@/data/photos";
import { realSaving, type Deal } from "@/data/deals";
import type { Meal } from "@/data/plan";
import { Button } from "./ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCovered, usePlanned, type usePlaceFlow } from "./PlanFlows";

const imageOf = (m: Meal) => m.image ?? mealPhoto[m.title] ?? photo.prep;

/** A deal is not something you plan, a dinner is. The button opens a pop-over of the dinners that use the deal's ingredient, with photos; picking one puts it on the plan. */
export function DealRecipes({ deal, place, label = "Include in a recipe" }: { deal: Deal; place: ReturnType<typeof usePlaceFlow>; label?: string }) {
  const mode = useApp((s) => s.mode);
  const ings = useIngredients();
  const { ctx, prefs } = useWeek();
  const covered = useCovered();
  const planned = usePlanned();
  const [open, setOpen] = useState(false);
  const found = useMemo(() => {
    if (!deal.slug || !ings.data) return null;
    const ing = ings.data.find((i) => i.slug === deal.slug);
    const parent = ing?.parent_id ? ings.data.find((i) => i.id === ing.parent_id) : undefined;
    const base = parent?.slug ?? deal.slug;
    return { base, name: (parent ?? ing)?.name ?? base, recipes: ctx.pool.filter((m) => fitsPrefs(m, prefs) && m.uses.includes(base)) };
  }, [deal.slug, ings.data, ctx.pool, prefs]);

  if (!found) return <p className="text-[13px] text-muted-foreground">We have no recipes for this product yet.</p>;
  if (found.recipes.length === 0) return <p className="text-[13px] text-muted-foreground">No dinner that fits you uses {found.name.toLowerCase()} yet.</p>;
  const weekTitles = new Set(planned.map((c) => c.meal.title));
  const usedBy = planned.filter((c) => c.meal.uses.includes(found.base));
  const options = found.recipes.filter((m) => !weekTitles.has(m.title)).slice(0, 6);
  return (
    <>
      <Button variant="secondary" className="min-h-10 w-full" aria-haspopup="dialog" onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cook with {deal.name}</DialogTitle>
            <DialogDescription>
              {eur(deal.price)} instead of {eur(deal.was)}{realSaving(deal) > 0 ? `, ${eur(realSaving(deal))} cheaper than the regular price` : ""}. Pick a dinner that uses {found.name.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          {(usedBy.length > 0 || covered(found.base)) && (
            <p className="rounded-[6px] bg-basil-tint px-3 py-2 text-[13px] text-basil">
              {usedBy.length > 0 ? `Already in your plan: ${usedBy.map((c) => `${c.meal.title} (${c.day})`).join(", ")}.` : ""}
              {covered(found.base) ? ` You already have ${found.name.toLowerCase()} at home.` : ""}
            </p>
          )}
          {options.length === 0 ? <p className="text-[14px] text-muted-foreground">Every dinner with {found.name.toLowerCase()} that fits you is already planned.</p> : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {options.map((m) => (
                <li key={m.title} className="flex flex-col overflow-hidden rounded-[8px] bg-sheet-2">
                  <img src={imageOf(m)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="text-[15px] font-semibold leading-snug">{m.title}</p>
                    <p className="text-[12.5px] text-muted-foreground">{[m.cuisine, m.minutes ? `${m.minutes} min` : null].filter(Boolean).join(" · ")}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      {m.slug ? <Link to="/recipe/$slug" params={{ slug: m.slug }} onClick={() => setOpen(false)} className="text-[13px] font-medium underline underline-offset-4">See recipe</Link> : <span />}
                      <Button className="min-h-10 px-3 text-[13.5px]" onClick={() => { useExp.getState().track("deal_added_to_plan"); setOpen(false); place.add(m); }}>{mode === "prep" ? "Add to plan" : "Pick for tonight"}</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
