import { useApp } from "@/lib/store";
import { useWeek } from "@/lib/use-week";
import { weekSlots } from "@/lib/week";
import { Button } from "./ui";
import { usePlaceFlow, useTonight } from "./PlanFlows";
import type { Meal } from "@/data/plan";

/** Put a recipe on the plan: a free day, or one that replaces a dinner after a confirmation. In Daily pick, tonight. */
export function AddToPlan({ meal }: { meal: Meal }) {
  const { chosen, mode } = useApp();
  const { ctx } = useWeek();
  const tonight = useTonight();
  const { add, dialogs } = usePlaceFlow();
  const there = weekSlots(chosen, ctx).find((s) => s.meal?.title === meal.title);
  if (mode === "daily" && tonight?.title === meal.title) return <span className="inline-flex min-h-10 items-center text-[14px] font-semibold text-basil">Tonight's dinner</span>;
  if (mode === "prep" && there) return <span className="inline-flex min-h-10 items-center text-[14px] font-semibold text-basil">On your plan: {there.day}</span>;
  return <><Button variant="secondary" className="min-h-10" onClick={() => add(meal)}>{mode === "daily" ? "Cook tonight" : "Add to plan"}</Button>{dialogs}</>;
}
