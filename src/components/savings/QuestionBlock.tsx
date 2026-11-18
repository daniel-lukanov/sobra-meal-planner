import { useMemo } from "react";
import { useT } from "@/lib/i18n";
import { optKey, qKey, QUESTIONS, shownOrder, toggleMulti, type QId } from "@/lib/savings/survey";
import { useExp } from "@/lib/experiment";
import type { ExperimentSession } from "@/lib/experiment-types";
import { cn } from "@/lib/utils";

type Rec = Record<string, unknown>;
const ORDER_FIELD: Partial<Record<QId, string>> = { q3: "b1_deal_habits_order", q5: "b3_actions_order", q9: "b3_stoppers_order" };

/** One survey question bound to its session field. Shuffled options store the order shown; exclusive options clear the others. */
export function QuestionBlock({ id, error }: { id: QId; error?: string | undefined }) {
  const { t } = useT();
  const q = QUESTIONS[id];
  const session = useExp((s) => s.session) as (ExperimentSession & Rec) | null;
  const update = useExp((s) => s.update);
  const order = useMemo(() => shownOrder(q), [q]);
  const orderField = ORDER_FIELD[id];
  const saved = session?.[q.field];
  const value: string[] = q.kind === "multi" ? ((saved as string[] | undefined) ?? []) : saved ? [saved as string] : [];
  const shown = (orderField && ((session?.[orderField] as string[] | undefined)?.length ? (session![orderField] as string[]) : order)) || order;

  const choose = (v: string) => {
    const next = q.kind === "multi" ? toggleMulti(q, value, v) : v;
    update({ [q.field]: next, ...(orderField ? { [orderField]: shown } : {}) } as Partial<ExperimentSession>);
  };
  return (
    <fieldset id={`q-${id}`} className="scroll-mt-24 border-t border-rule pt-5" aria-describedby={error ? `e-${id}` : undefined}>
      <legend className="float-left mb-3 w-full text-[15.5px] font-semibold">{t(qKey(id))}</legend>
      <div className="clear-both flex flex-wrap gap-2">
        {shown.map((v) => {
          const on = value.includes(v);
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => choose(v)}
              className={cn("press min-h-11 rounded-[6px] px-4 py-2 text-left text-[14.5px] font-medium", on ? "bg-basil text-basil-ink" : "bg-sheet-2 hover:bg-sheet-hover")}>{t(optKey(id, v))}</button>
          );
        })}
      </div>
      {error && <p id={`e-${id}`} role="alert" className="mt-2 text-[13.5px] font-semibold text-tomato">{error}</p>}
    </fieldset>
  );
}

export const answered = (s: (ExperimentSession & Rec) | null, id: QId) => {
  const v = s?.[QUESTIONS[id].field];
  return Array.isArray(v) ? v.length > 0 : !!v;
};
