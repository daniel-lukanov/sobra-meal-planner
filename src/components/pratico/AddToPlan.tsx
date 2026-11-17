import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { useWeek } from "@/lib/use-week";
import { weekSlots } from "@/lib/week";
import { Button } from "./ui";
import type { Meal } from "@/data/plan";

/** Put a recipe on a day of this week: a free day, or one that replaces the dinner already there. */
export function AddToPlan({ meal, label = "Add to plan" }: { meal: Meal; label?: string }) {
  const [open, setOpen] = useState(false);
  const { chosen, set } = useApp();
  const { ctx } = useWeek();
  const slots = weekSlots(chosen, ctx);
  const there = slots.find((s) => s.meal?.title === meal.title);
  if (there) return <span className="inline-flex min-h-10 items-center text-[14px] font-semibold text-basil">On your plan: {there.day}</span>;
  if (slots.length === 0) return null;
  const put = (i: number, day: string) => {
    set({ chosen: { ...chosen, [i]: meal.title }, weekAccepted: false });
    setOpen(false);
    toast(`${meal.title} added for ${day}.`);
  };
  return (
    <div>
      <Button variant="secondary" className="min-h-10" aria-expanded={open} onClick={() => setOpen(!open)}>{label}</Button>
      {open && (
        <div className="slide-in mt-2">
          <p className="text-[12.5px] font-semibold text-muted-foreground">Which day?</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {slots.map((s) => (
              <li key={s.i}>
                <button type="button" onClick={() => put(s.i, s.day)} className="press min-h-10 bg-sheet-2 px-3 text-left text-[13.5px] hover:bg-sheet-hover">
                  <span className="font-semibold">{s.day}</span> <span className="text-muted-foreground">{s.meal ? `replaces ${s.meal.title}` : "free"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
