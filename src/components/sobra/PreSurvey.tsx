import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { PAIN_NONE, WORK_NONE, fallbackOptions, painShuffled, shuffle, storeOptions, workaroundOptions } from "@/data/survey";
import { Button } from "./ui";
import { SobraLogo, StoreBadge } from "./Brand";
import { Multi, Question, Single, useRequired } from "./form";
import { cn } from "@/lib/utils";
import type { StoreName } from "@/data/stores";

/** Block 1: one required screen before the app. */
export function PreSurvey() {
  const update = useExp((s) => s.update);
  const session = useExp((s) => s.session)!;
  const setApp = useApp((s) => s.set);
  const navigate = useNavigate();
  const [store, setStore] = useState<string | null>(session.store);
  const [fb, setFb] = useState<string | null>(session.b1_fallback_dinners);
  const [pains, setPains] = useState<string[]>(session.b1_pains);
  const [work, setWork] = useState<string[]>(session.b1_workarounds);
  const { errors, check, clear } = useRequired();

  // Shuffle the first six pains once per session and keep the order we showed.
  useEffect(() => {
    if (!session.b1_pains_order.length) update({ b1_pains_order: [...shuffle(painShuffled), PAIN_NONE] });
  }, [session.b1_pains_order.length, update]);
  const painOrder = session.b1_pains_order.length ? session.b1_pains_order : [...painShuffled, PAIN_NONE];

  const finish = () => {
    if (!check([
      { id: "store", ok: !!store, msg: "Pick your store to continue" },
      { id: "fb", ok: !!fb },
      { id: "pains", ok: pains.length > 0 },
      { id: "work", ok: work.length > 0 },
    ])) return;
    update({ store, b1_fallback_dinners: fb, b1_pains: pains, b1_workarounds: work, survey_pre_completed: true }, true);
    if (session.ref && session.utm_source === "whatsapp_share") useExp.getState().track("referral_activated");
    setApp({ setupDone: true, store: store as StoreName, ...(session.shared_plan_id ? {} : { mode: session.ab_plan_variant === "A_weekly_prep" ? "prep" : "daily" }) });
    useExp.getState().setTour(1);
    navigate({ to: "/plan" });
  };

  return (
    <div className="mx-auto my-8 max-w-2xl rounded-sheet bg-sheet p-6 sm:p-8">
      <SobraLogo />
      <h1 className="mt-6 text-[26px] font-bold">Let's build your week</h1>
      <p className="mt-2 text-muted-foreground">Pick your store so we can price your dinners. Then 3 quick questions.</p>

      <div className="mt-6 space-y-6">
        <Question id="store" title="Pick your store" hint="We need this for the plan" error={errors["store"]}>
          <div className="flex flex-wrap gap-2">
            {storeOptions.map((s) => (
              <button key={s} type="button" aria-label={s} aria-pressed={store === s} onClick={() => { setStore(s); clear("store"); }}
                className={cn("press min-h-11 rounded-full p-1 ring-2", store === s ? "ring-ink" : "ring-transparent hover:ring-rule")}>
                <StoreBadge name={s} className="h-9 px-3" />
              </button>
            ))}
          </div>
        </Question>

        <p className="eyebrow border-t border-rule pt-6">3 quick questions</p>
        <Question id="fb" title="1. In the last 7 days, how many dinners were plain pasta, takeaway or skipped?" error={errors["fb"]}>
          <Single options={fallbackOptions} value={fb} onChange={(v) => { setFb(v); clear("fb"); }} />
        </Question>
        <Question id="pains" title="2. What bugs you most about weekday dinners? Pick up to 2." error={errors["pains"]}>
          <Multi options={painOrder} value={pains} max={2} exclusive={PAIN_NONE} onChange={(v) => { setPains(v); clear("pains"); }} />
        </Question>
        <Question id="work" title="3. What do you do now to sort out meals? Select all that apply." error={errors["work"]}>
          <Multi options={workaroundOptions} value={work} exclusive={WORK_NONE} onChange={(v) => { setWork(v); clear("work"); }} />
        </Question>
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <Button className="w-full sm:w-auto" onClick={finish}>Show my plan</Button>
      </div>
    </div>
  );
}
