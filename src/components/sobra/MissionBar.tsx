import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useExp } from "@/lib/experiment";
import { taskKeys, tasksDone, type TaskKey } from "@/lib/experiment-types";
import { VerdictModal } from "./VerdictModal";
import { cn } from "@/lib/utils";

const tasks: Record<TaskKey, { label: string; to: "/plan" | "/deals" | "/list" | "/fridge"; hint: string }> = {
  task_1_plan: { label: "Plan", to: "/plan", hint: "Tap a base filter or Accept this week" },
  task_2_mode: { label: "Mode", to: "/plan", hint: "Switch between Weekly prep and Daily pick" },
  task_3_deals: { label: "Deals", to: "/deals", hint: "Toggle a price alert" },
  task_4_list: { label: "List", to: "/list", hint: "Check off 1 grocery item" },
  task_5_fridge: { label: "Fridge", to: "/fridge", hint: "Tap Scan a receipt" },
};

export function MissionBar() {
  const s = useExp((x) => x.session);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!s) return null;
  const done = tasksDone(s);
  const finished = s.survey_post_completed;
  return (
    <>
      <div className="fixed inset-x-4 bottom-16 z-30 mx-auto max-w-4xl md:bottom-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sheet bg-ink px-5 py-3 text-sheet shadow-float">
          <ol className="flex flex-wrap items-center gap-1.5" aria-label="Test tasks">
            {taskKeys.map((k, i) => {
              const t = tasks[k]; const on = s[k];
              return (
                <li key={k}>
                  <Link to={t.to} title={t.hint} aria-label={`Task ${i + 1}: ${t.hint}${on ? ", done" : ""}`}
                    className={cn("press flex min-h-9 items-center gap-1 rounded-[6px] px-3 text-[13px] font-semibold", on ? "bg-basil text-basil-ink" : "bg-sheet/10 text-sheet hover:bg-sheet/20")}>
                    {on ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <span className="num">{i + 1}.</span>}{t.label}
                  </Link>
                </li>
              );
            })}
            <li className="num ml-1 text-[13px] text-sheet/75" aria-live="polite">{done} of 5 tasks tried</li>
          </ol>
          <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { useExp.getState().setTour({ step: 1, sub: "guided_focus" }); navigate({ to: "/plan" }); }} className="text-[13px] font-medium text-sheet/80 underline underline-offset-4 hover:text-sheet">Restart guided tour</button>
          <button type="button" onClick={() => setOpen(true)} className="press min-h-10 rounded-[8px] bg-tape px-4 py-2 text-[14px] font-bold text-ink">
            {finished ? (s.bonus_completed ? "See my reward" : "Unlock bonus reward") : "Finish & Claim Free Month (25 sec) ->"}
          </button>
          </div>
        </div>
      </div>
      <VerdictModal open={open} onOpenChange={setOpen} />
    </>
  );
}
