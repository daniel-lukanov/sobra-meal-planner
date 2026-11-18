import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/pratico/ui";
import { CtaCard } from "@/components/savings/CtaCard";
import { QuestionBlock } from "@/components/savings/QuestionBlock";
import { RaffleCard } from "@/components/savings/RaffleCard";
import { ShareRow } from "@/components/savings/Share";
import { useExp } from "@/lib/experiment";
import { useT } from "@/lib/i18n";
import { useResult } from "@/lib/savings/use-result";

export const Route = createFileRoute("/finish")({ component: Finish });

function Finish() {
  const { t } = useT();
  const [step, setStep] = useState<"questions" | "end">("questions");
  const session = useExp((s) => s.session);
  const { res, manual } = useResult();
  const nothing = session?.b3_actions?.includes("nothing");

  if (step === "questions") {
    return (
      <div>
        <h1 className="font-serif text-[28px] font-medium">{t("fin.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("fin.sub")}</p>
        <div className="mt-5 space-y-5">
          <QuestionBlock id="q4" />
          <QuestionBlock id="q5" />
          {nothing && <QuestionBlock id="q5b" />}
          <QuestionBlock id="q6" />
          <QuestionBlock id="q7" />
          <QuestionBlock id="q8" />
          <QuestionBlock id="q9" />
          <div>
            <label htmlFor="q9-other" className="text-[13.5px] font-medium text-muted-foreground">{t("q9.other")}</label>
            <input id="q9-other" maxLength={280} defaultValue={session?.b3_stoppers_other ?? ""} onChange={(e) => useExp.getState().update({ b3_stoppers_other: e.target.value.trim() || null })}
              className="mt-1 min-h-11 w-full rounded-ctl bg-sheet-2 px-3 text-[14.5px]" />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" onClick={() => { useExp.getState().update({ survey_post_completed: true }, true); setStep("end"); window.scrollTo({ top: 0 }); }}>{t("fin.continue")}</Button>
          <Button variant="quiet" className="self-center" onClick={() => { setStep("end"); window.scrollTo({ top: 0 }); }}>{t("fin.skip")}</Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h1 className="font-serif text-[28px] font-medium">{t("fin.done_title")}</h1>
      <div className="mt-5 space-y-4">
        <CtaCard />
        <RaffleCard />
        <ShareRow res={res} manual={manual} primary />
      </div>
      <Link to="/" className="mt-5 inline-block py-2 text-[14px] font-medium text-muted-foreground hover:text-ink">{t("res.start_over")}</Link>
    </div>
  );
}
