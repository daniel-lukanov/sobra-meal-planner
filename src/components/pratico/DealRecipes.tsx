import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { useWeek } from "@/lib/use-week";
import { fitsPrefs } from "@/lib/prefs";
import { useIngredients } from "@/lib/db-queries";
import type { Deal } from "@/data/deals";
import { Button } from "./ui";
import { useCovered, usePlanned, type usePlaceFlow } from "./PlanFlows";

/** A deal is not something you plan, a dinner is. This lists the dinners that use the deal's ingredient and puts the one the person picks on the plan. */
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
  const options = found.recipes.filter((m) => !weekTitles.has(m.title)).slice(0, 4);
  return (
    <div>
      <Button variant="secondary" className="min-h-10 w-full" aria-expanded={open} onClick={() => setOpen(!open)}>{label}</Button>
      {open && (
        <div className="slide-in mt-3 space-y-3">
          {(usedBy.length > 0 || covered(found.base)) && (
            <p className="rounded-[6px] bg-basil-tint px-3 py-2 text-[13px] text-basil">
              {usedBy.length > 0 ? `Already in your plan: ${usedBy.map((c) => `${c.meal.title} (${c.day})`).join(", ")}.` : ""}
              {covered(found.base) ? ` You already have ${found.name.toLowerCase()} at home.` : ""}
            </p>
          )}
          {options.length === 0 ? <p className="text-[13.5px] text-muted-foreground">Every recipe with {found.name.toLowerCase()} that fits you is already planned.</p> : (
            <ul className="space-y-2">
              {options.map((m) => (
                <li key={m.title} className="flex items-center justify-between gap-2">
                  {m.slug ? <Link to="/recipe/$slug" params={{ slug: m.slug }} className="min-w-0 text-[14px] font-medium hover:underline">{m.title}</Link> : <span className="text-[14px] font-medium">{m.title}</span>}
                  <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[13px]" onClick={() => { useExp.getState().track("deal_added_to_plan"); place.add(m); }}>{mode === "prep" ? "Add to plan" : "Pick for tonight"}</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
