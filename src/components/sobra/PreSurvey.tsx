import { useNavigate } from "@tanstack/react-router";
import { User, Users, UsersRound, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { fallbackOptions, householdOptions, painOptions, storeOptions, workaroundOptions } from "@/data/survey";
import { Button } from "./ui";
import { SobraLogo, StoreBadge } from "./Brand";
import { cn } from "@/lib/utils";

const householdIcons: LucideIcon[] = [User, Users, UsersRound, UtensilsCrossed];

export function Q({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-rule pt-5">
      <legend className="float-left mb-3 w-full text-[15.5px] font-semibold">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}
export function Pill({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-[6px] px-4 text-left text-[14.5px] font-medium", on ? "bg-basil text-basil-ink" : "bg-sheet-2 hover:bg-sheet-hover", className)}>{children}</button>
  );
}

export function PreSurvey() {
  const update = useExp((s) => s.update);
  const skip = useExp((s) => s.skip);
  const session = useExp((s) => s.session)!;
  const setApp = useApp((s) => s.set);
  const navigate = useNavigate();
  const [h, setH] = useState(""); const [f, setF] = useState(""); const [w, setW] = useState(""); const [st, setSt] = useState("");
  const [pains, setPains] = useState<string[]>([]);
  const [spend, setSpend] = useState(45);
  const done = h && f && w && st && pains.length === 2;

  const tapPain = (p: string) => setPains((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : cur.length >= 2 ? [cur[0]!, p] : [...cur, p]);

  const finish = () => {
    update({ q1_household: h, q2_fallback_nights: f, q3_pain_1: pains[0]!, q3_pain_2: pains[1]!, q4_workaround: w, q5_primary_store: st, q5_weekly_spend: spend, survey_pre_completed: true }, true);
    setApp({ setupDone: true, mode: session.ab_plan_variant === "A_weekly_prep" ? "prep" : "daily", store: st as (typeof storeOptions)[number] });
    useExp.getState().setTour({ step: 1, sub: "guided_focus" });
    navigate({ to: "/plan" });
  };

  return (
    <div className="mx-auto my-8 max-w-2xl rounded-sheet bg-sheet p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <SobraLogo />
        <button type="button" onClick={skip} className="min-h-11 text-[13.5px] font-medium text-muted-foreground underline-offset-4 hover:text-ink hover:underline">Skip to app</button>
      </div>
      <p className="mt-6 inline-flex rounded-[6px] bg-mustard-tint px-3 py-1 text-[12.5px] font-semibold text-mustard-ink">Lisbon Food Study · 40 seconds · Get 1 Month Free</p>
      <h1 className="mt-3 text-[26px] font-bold">How did dinner go for you this past week?</h1>
      <p className="mt-2 text-muted-foreground">Five quick taps. Your answers shape the plan on the next screen.</p>

      <div className="mt-6 space-y-6">
        <Q title="1. Who do you usually cook for in Lisbon?">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {householdOptions.map((o, i) => {
              const Icon = householdIcons[i]!; const on = h === o;
              return (
                <button key={o} type="button" aria-pressed={on} onClick={() => setH(o)}
                  className={cn("press flex min-h-14 items-center gap-3 rounded-[8px] border px-3.5 text-left text-[14.5px] font-medium", on ? "border-basil bg-basil-tint" : "border-rule bg-sheet hover:bg-sheet-2")}>
                  <Icon className={cn("size-5 shrink-0", on ? "text-basil" : "text-muted-foreground")} strokeWidth={1.7} aria-hidden />{o}
                </button>
              );
            })}
          </div>
        </Q>
        <Q title="2. In the last 7 days, on how many nights did you eat basic emergency food (plain pasta, toast), skip dinner, or order delivery because you had no plan or energy?">
          <div className="flex flex-wrap gap-2">{fallbackOptions.map((o) => <Pill key={o} on={f === o} onClick={() => setF(o)}>{o}</Pill>)}</div>
        </Q>
        <Q title="3. Which TWO things frustrate you most about weekday dinners? (Tap your #1 biggest pain, then your #2)">
          <div className="space-y-2">
            {painOptions.map((o) => {
              const rank = pains.indexOf(o);
              return (
                <button key={o} type="button" aria-pressed={rank >= 0} onClick={() => tapPain(o)}
                  className={cn("press flex min-h-12 w-full items-center justify-between gap-3 rounded-[8px] border px-3.5 py-2.5 text-left text-[14.5px]",
                    rank === 0 ? "border-tomato bg-tomato-tint font-semibold" : rank === 1 ? "border-mustard bg-mustard-tint font-semibold" : "border-rule bg-sheet hover:bg-sheet-2")}>
                  {o}
                  {rank === 0 && <span className="shrink-0 rounded-[6px] bg-tomato px-2.5 py-0.5 text-[12px] font-bold text-sheet">#1 Biggest Pain</span>}
                  {rank === 1 && <span className="shrink-0 rounded-[6px] bg-mustard px-2.5 py-0.5 text-[12px] font-bold text-ink">#2 Runner-Up</span>}
                </button>
              );
            })}
          </div>
        </Q>
        <Q title="4. How do you currently handle meal planning and groceries?">
          <div className="flex flex-wrap gap-2">{workaroundOptions.map((o) => <Pill key={o} on={w === o} onClick={() => setW(o)}>{o}</Pill>)}</div>
        </Q>
        <Q title="5. Which supermarket is closest to you?">
          <div className="flex flex-wrap gap-2">
            {storeOptions.map((s) => (
              <button key={s} type="button" aria-pressed={st === s} onClick={() => { setSt(s); setApp({ store: s }); }}
                className={cn("press min-h-11 rounded-full p-1 ring-2", st === s ? "ring-ink" : "ring-transparent hover:ring-rule")}>
                <StoreBadge name={s} className="min-h-9 px-3.5 text-[14px]" />
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <label htmlFor="spend" className="text-[15px] font-semibold">Roughly how much do you spend on groceries per person per week?</label>
            <span className="num shrink-0 rounded-[6px] bg-basil-tint px-3 py-1 text-[16px] font-bold text-basil">€{spend}/week</span>
          </div>
          <input id="spend" type="range" min={15} max={100} step={5} value={spend} onChange={(e) => setSpend(Number(e.target.value))} className="mt-3 w-full accent-[var(--basil)]" />
          <div className="num flex justify-between text-[12px] text-muted-foreground"><span>€15</span><span>€100</span></div>
        </Q>
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <Button className="w-full sm:w-auto" disabled={!done} onClick={finish}>Unlock my personalized Sobra plan -&gt;</Button>
        {!done && <p className="mt-2 text-[13px] text-muted-foreground">Answer all five (two pains in question 3) to continue, or skip to the app.</p>}
      </div>
    </div>
  );
}
