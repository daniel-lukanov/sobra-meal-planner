import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Clock3, Hourglass, ShoppingCart, Tag, User, Users, UsersRound, UtensilsCrossed, Wallet, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { fallbackOptions, householdOptions, painOptions, spendOptions, storeOptions, workaroundOptions } from "@/data/survey";
import type { StoreName } from "@/data/stores";
import { Button } from "./ui";
import { SobraLogo, StoreBadge } from "./Brand";
import { cn } from "@/lib/utils";

const householdIcons: LucideIcon[] = [User, Users, UsersRound, UtensilsCrossed];
const painIcons: LucideIcon[] = [Hourglass, Clock3, Wallet, AlertCircle, Tag];

function Q({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-rule pt-5">
      <legend className="float-left mb-3 w-full text-[15.5px] font-semibold"><span className="num mr-2 font-serif text-muted-foreground">{n}</span>{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}
function Pill({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-full px-4 text-[14.5px] font-medium", on ? "bg-ink text-sheet" : "bg-sheet-2 hover:bg-sheet-hover", className)}>{children}</button>
  );
}

export function PreSurvey() {
  const update = useExp((s) => s.update);
  const skip = useExp((s) => s.skip);
  const session = useExp((s) => s.session)!;
  const setApp = useApp((s) => s.set);
  const navigate = useNavigate();
  const [a, setA] = useState({ household_size: "", fallback_nights: "", top_pain: "", current_workaround: "", preferred_store: "", weekly_spend: "" });
  const pick = (k: keyof typeof a, v: string) => setA((p) => ({ ...p, [k]: v }));
  const done = Object.values(a).every(Boolean);

  const finish = () => {
    update({ ...a, survey_pre_completed: true });
    setApp({ setupDone: true, mode: session.ab_plan_variant === "A_weekly_prep" ? "prep" : "daily", ...(a.preferred_store ? { store: a.preferred_store as StoreName } : {}) });
    navigate({ to: "/plan" });
  };

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="card p-5 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <SobraLogo />
          <button type="button" onClick={() => { skip(); }} className="min-h-11 text-[13.5px] font-medium text-muted-foreground underline-offset-4 hover:text-ink hover:underline">Skip to app</button>
        </div>
        <p className="mt-6 inline-flex rounded-full bg-mustard-tint px-3 py-1 text-[12.5px] font-semibold text-[var(--mustard-ink)]">Católica Lisbon NVC Study · 45 seconds</p>
        <h1 className="mt-3 text-[26px] font-bold">How did dinner go for you this past week?</h1>
        <p className="mt-2 text-muted-foreground">Five quick taps about how you actually shop and cook in Lisbon. Your answers customize the prototype on the next screen.</p>

        <div className="mt-6 space-y-6">
          <Q n={1} title="Who do you usually cook for?">
            <div className="grid grid-cols-2 gap-2">
              {householdOptions.map((o, i) => {
                const Icon = householdIcons[i]!; const on = a.household_size === o;
                return (
                  <button key={o} type="button" aria-pressed={on} onClick={() => pick("household_size", o)}
                    className={cn("press flex min-h-14 items-center gap-3 rounded-[14px] border px-3.5 text-left text-[14.5px] font-medium", on ? "border-basil bg-basil-tint" : "border-rule bg-sheet hover:bg-sheet-2")}>
                    <Icon className={cn("size-5 shrink-0", on ? "text-basil" : "text-muted-foreground")} strokeWidth={1.7} aria-hidden />{o}
                  </button>
                );
              })}
            </div>
          </Q>
          <Q n={2} title="In the last 7 days, on how many nights did you eat plain pasta, skip dinner, or order delivery because you had no plan or energy?">
            <div className="flex flex-wrap gap-2">{fallbackOptions.map((o) => <Pill key={o} on={a.fallback_nights === o} onClick={() => pick("fallback_nights", o)}>{o}</Pill>)}</div>
          </Q>
          <Q n={3} title="Think about the last time making dinner annoyed you. What was the #1 frustration?">
            <div className="space-y-2">
              {painOptions.map((o, i) => {
                const Icon = painIcons[i]!; const on = a.top_pain === o;
                return (
                  <button key={o} type="button" aria-pressed={on} onClick={() => pick("top_pain", o)}
                    className={cn("press flex min-h-12 w-full items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left text-[14.5px]", on ? "border-basil bg-basil-tint font-semibold" : "border-rule bg-sheet hover:bg-sheet-2")}>
                    <Icon className={cn("size-[18px] shrink-0", on ? "text-basil" : "text-muted-foreground")} strokeWidth={1.7} aria-hidden />{o}
                  </button>
                );
              })}
            </div>
          </Q>
          <Q n={4} title="What do you use to plan groceries right now?">
            <div className="flex flex-wrap gap-2">{workaroundOptions.map((o) => <Pill key={o} on={a.current_workaround === o} onClick={() => pick("current_workaround", o)}>{o}</Pill>)}</div>
          </Q>
          <Q n={5} title="Which supermarket is closest to you?">
            <div className="flex flex-wrap gap-2">
              {storeOptions.map((st) => {
                const on = a.preferred_store === st;
                return (
                  <button key={st} type="button" aria-pressed={on} onClick={() => { pick("preferred_store", st); setApp({ store: st }); }}
                    className={cn("press min-h-11 rounded-full p-1 ring-2", on ? "ring-ink" : "ring-transparent hover:ring-rule")}>
                    <StoreBadge name={st} className="min-h-9 px-3.5 text-[14px]" />
                  </button>
                );
              })}
            </div>
            <p className="mb-3 mt-5 flex items-center gap-2 text-[15.5px] font-semibold"><ShoppingCart className="size-4 text-muted-foreground" aria-hidden />Roughly how much do you spend on groceries per week?</p>
            <div className="flex flex-wrap gap-2">{spendOptions.map((o) => <Pill key={o} on={a.weekly_spend === o} onClick={() => pick("weekly_spend", o)}>{o}</Pill>)}</div>
          </Q>
        </div>

        <div className="mt-8 border-t border-rule pt-6">
          <Button className="w-full sm:w-auto" disabled={!done} onClick={finish}>Open my personalized Lisbon plan</Button>
          {!done && <p className="mt-2 text-[13px] text-muted-foreground">Answer all five to continue, or skip to the app.</p>}
        </div>
      </div>
    </div>
  );
}
