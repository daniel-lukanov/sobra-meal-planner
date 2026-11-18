import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/pratico/ui";
import { StoreBadge } from "@/components/pratico/Brand";
import { BackLink, Progress, jumpTo } from "@/components/savings/bits";
import { QuestionBlock } from "@/components/savings/QuestionBlock";
import { useExp } from "@/lib/experiment";
import { useT, type Key } from "@/lib/i18n";
import { MANUAL_CHIPS, SAVINGS_STORES } from "@/lib/savings/prices";
import { useSavings } from "@/lib/savings/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manual")({ component: Manual });

function Manual() {
  const { t } = useT();
  const navigate = useNavigate();
  const { picks, usualStore } = useSavings();
  const [err, setErr] = useState<{ store?: string; products?: string }>({});
  const set = useSavings.getState().set;
  const toggle = (id: string) => set({ picks: picks.includes(id) ? picks.filter((x) => x !== id) : [...picks, id] });
  const show = () => {
    const e: typeof err = {};
    if (!usualStore) e.store = t("man.missing_store");
    if (picks.length === 0) e.products = t("man.missing_products");
    setErr(e);
    if (e.store) return jumpTo("q-store");
    if (e.products) return jumpTo("q-products");
    useExp.getState().update({ store: usualStore });
    void navigate({ to: "/result" });
  };
  return (
    <div>
      <Progress step={2} />
      <h1 className="font-serif text-[26px] font-medium">{t("man.title")}</h1>
      <div className="mt-4"><QuestionBlock id="q1" /></div>
      <fieldset id="q-store" className="mt-5 scroll-mt-24 border-t border-rule pt-5">
        <legend className="float-left mb-3 w-full text-[15.5px] font-semibold">{t("man.store")}</legend>
        <div className="clear-both flex flex-wrap gap-2">
          {SAVINGS_STORES.map((s) => (
            <button key={s} type="button" aria-pressed={usualStore === s} aria-label={s} onClick={() => set({ usualStore: s })}
              className={cn("press min-h-11 rounded-[6px] p-1", usualStore === s ? "ring-2 ring-basil" : "ring-1 ring-rule")}><StoreBadge name={s} /></button>
          ))}
        </div>
        {err.store && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-tomato">{err.store}</p>}
      </fieldset>
      <fieldset id="q-products" className="mt-5 scroll-mt-24 border-t border-rule pt-5">
        <legend className="float-left mb-3 w-full text-[15.5px] font-semibold">{t("man.products")}</legend>
        <div className="clear-both flex flex-wrap gap-2">
          {MANUAL_CHIPS.map((id) => {
            const on = picks.includes(id);
            return <button key={id} type="button" aria-pressed={on} onClick={() => toggle(id)}
              className={cn("press min-h-11 rounded-[6px] px-4 py-2 text-left text-[14.5px] font-medium", on ? "bg-basil text-basil-ink" : "bg-sheet-2 hover:bg-sheet-hover")}>{t(`p.${id}` as Key)}</button>;
          })}
        </div>
        {err.products && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-tomato">{err.products}</p>}
      </fieldset>
      <Button className="mt-6 w-full" onClick={show}>{t("man.show")}</Button>
      <BackLink to="/" label={t("common.back")} />
    </div>
  );
}
