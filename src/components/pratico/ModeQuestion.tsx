import { useState } from "react";
import { useExp } from "@/lib/experiment";
import { modeOptions, needsPrepBlockers, prepBlockerOptions } from "@/data/survey";
import { Button } from "./ui";
import { Multi, Question, Single, TextLine, useRequired } from "./form";

/** Block 2: asked inline on the plan once the tester has seen both modes or finished the tour. */
export function ModeQuestion() {
  const s = useExp((x) => x.session);
  const tourEnded = useExp((x) => x.tourEnded);
  const [mode, setMode] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [blockers, setBlockers] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const { errors, check, clear } = useRequired();
  if (!s || !s.survey_pre_completed) return null;
  if (done) return <p role="status" className="mb-8 border-l-[3px] border-basil pl-4 text-[14.5px]">Thanks, that helps us decide what to build.</p>;
  if (s.b2_mode_pref || !((s.opened_weekly && s.opened_daily) || tourEnded)) return null;
  const follow = needsPrepBlockers(mode);
  const save = () => {
    if (!check([{ id: "mode", ok: !!mode }, { id: "blockers", ok: !follow || blockers.length > 0 }])) return;
    useExp.getState().update({ b2_mode_pref: mode, b2_mode_reason: reason.trim() || null, b2_prep_blockers: follow ? blockers : [] }, true);
    setDone(true);
  };
  return (
    <section aria-label="Quick question" className="mb-8 rounded-sheet bg-sheet p-5">
      <Question id="mode" title="Which would you actually use next week?" error={errors["mode"]}>
        <Single options={modeOptions} value={mode} onChange={(v) => { setMode(v); clear("mode"); }} />
        <TextLine id="mode-reason" label="Why? (optional)" value={reason} onChange={setReason} />
      </Question>
      {follow && (
        <div className="mt-5">
          <Question id="blockers" title="What puts you off weekly prep? Select all that apply." error={errors["blockers"]}>
            <Multi options={prepBlockerOptions} value={blockers} onChange={(v) => { setBlockers(v); clear("blockers"); }} />
          </Question>
        </div>
      )}
      <Button className="mt-5" onClick={save}>Send answer</Button>
    </section>
  );
}
