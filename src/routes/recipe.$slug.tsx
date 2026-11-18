import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Clock } from "lucide-react";
import { eur, useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { mealPhoto, photo } from "@/data/photos";
import { useWeek } from "@/lib/use-week";
import { useLivePlan } from "@/lib/live-plan";
import { useIngredients, useRecipes } from "@/lib/db-queries";
import { formatAmount } from "@/lib/amounts";
import { FRIDGE_SLUG } from "@/lib/household-data";
import { ALLERGENS } from "@/lib/prefs";
import { Crumbs } from "@/components/pratico/Crumbs";
import { AddToPlan } from "@/components/pratico/AddToPlan";
import { Button } from "@/components/pratico/ui";

export const Route = createFileRoute("/recipe/$slug")({
  head: pageHead("Recipe", "What goes in a dinner, what it costs and how long it takes."),
  component: Recipe,
});

function Recipe() {
  const { slug } = Route.useParams();
  const { ctx, status } = useWeek();
  const planning = useLivePlan();
  const ingredients = useIngredients(), recipes = useRecipes();
  const fridge = useApp((s) => s.fridge);
  const navigate = useNavigate();
  const meal = ctx.pool.find((m) => m.slug === slug);
  const lines = useMemo(() => {
    if (!meal || !ingredients.data || !recipes.data) return [];
    const r = recipes.data.recipes.find((x) => x.slug === slug);
    if (!r) return [];
    const byId = new Map(ingredients.data.map((i) => [i.id, i]));
    return recipes.data.lines.filter((l) => l.recipe_id === r.id && !l.is_optional).flatMap((l) => {
      const i = byId.get(l.ingredient_id);
      return i ? [{ name: i.name, qty: formatAmount(l.quantity, i.base_unit), staple: i.is_pantry_staple, slug: i.slug }] : [];
    }).sort((a, b) => Number(a.staple) - Number(b.staple));
  }, [meal, ingredients.data, recipes.data, slug]);

  if (status === "loading") return <><Crumbs trail={[{ label: "Home", to: "/" }, { label: "Recipe" }]} /><p className="text-muted-foreground">Loading the recipe.</p></>;
  if (!meal) return (
    <>
      <Crumbs trail={[{ label: "Home", to: "/" }, { label: "Recipe" }]} />
      <h1 className="text-[26px] font-bold">We could not find that recipe</h1>
      <p className="mt-2 text-muted-foreground">It may not fit your settings, or it was removed. <Link to="/" className="underline underline-offset-4">Back to Home</Link>.</p>
    </>
  );
  const allergens = (meal.allergens ?? []).map((c) => ALLERGENS.find((a) => a.code === c)?.label.split(" (")[0] ?? c);
  return (
    <>
      <Crumbs trail={[{ label: "Home", to: "/" }, { label: "Recipe" }]} />
      <div className="mb-6 aspect-[16/7] overflow-hidden rounded-[8px] bg-sheet-2">
        <img src={meal.image ?? mealPhoto[meal.title] ?? photo.prep} alt={meal.title} width={1200} height={525} className="size-full object-cover" />
      </div>
      <h1 className="text-[28px] font-bold md:text-[34px]">{meal.title}</h1>
      <p className="num mt-1 flex items-center gap-2 text-[14px] text-muted-foreground"><Clock className="size-4" aria-hidden />{meal.minutes ?? 20} min · {eur(planning.priceOf(meal))} for {useApp.getState().people}</p>
      {meal.summary && <p className="mt-3 max-w-[60ch] text-[16px]">{meal.summary}</p>}
      <div className="mt-5 flex flex-wrap items-start gap-3">
        <Button onClick={() => navigate({ to: "/cook", search: { recipe: slug } })}>Start cooking</Button>
        <AddToPlan meal={meal} />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="ing" className="card p-5">
          <h2 id="ing" className="text-[18px]">Ingredients</h2>
          <ul className="mt-3 divide-y divide-rule">
            {lines.map((l) => (
              <li key={l.slug} className="flex justify-between gap-3 py-2.5">
                <span><span className="font-medium">{l.name}</span> <span className="num text-muted-foreground">{l.qty}</span></span>
                <span className="text-[13px] text-muted-foreground">{l.staple ? "pantry" : fridge.some((f) => (FRIDGE_SLUG[f.id] ?? f.id) === l.slug) ? "in fridge" : ""}</span>
              </li>
            ))}
          </ul>
          {allergens.length > 0 && <p className="mt-3 text-[13px] text-muted-foreground">Contains: {allergens.join(", ").toLowerCase()}. Always check the label of what you buy.</p>}
        </section>
        <section aria-labelledby="how" className="card p-5">
          <h2 id="how" className="text-[18px]">How it goes</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {(meal.steps?.relaxed ?? []).map((s, k) => <li key={k} className="text-[15px]">{s.text}</li>)}
          </ol>
        </section>
      </div>
    </>
  );
}
