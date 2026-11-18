import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp, prefsOf } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { useWeek } from "@/lib/use-week";
import { ALLERGENS, GOALS, PROTEINS, ALL_PROTEINS, fitsPrefs } from "@/lib/prefs";
import { Button } from "./ui";
import { PraticoLogo, StoreBadge } from "./Brand";
import { storeOptions } from "@/data/survey";
import { PreSurvey } from "./PreSurvey";
import { cn } from "@/lib/utils";
import { representative } from "@/lib/representative";
import { matchIngredient } from "@/lib/fridge-match";
import { surveyDone } from "@/lib/survey-registry";
import { useSession } from "@/lib/account";

const STEPS = ["Survey", "Goals", "Allergies", "Proteins", "Meals", "Fridge"] as const;
const ICON: Record<string, string> = { poultry: "🐔", beef: "🐄", pork: "🐖", other_meat: "🐑", fish: "🐟", shellfish: "🦐", vegetarian: "🥕", vegan: "🌱" };
const MIN_MEALS = 3;

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-[6px] px-4 py-2 text-left text-[14.5px] font-medium", on ? "bg-basil text-basil-ink" : "bg-sheet-2 hover:bg-sheet-hover")}>{children}</button>
  );
}
const toggle = (list: string[], c: string) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);

/** First visit: survey, then the quick setup that decides which dinners we may show. Everything saves as you go. */
export function Onboarding() {
  const session = useExp((s) => s.session)!;
  const app = useApp();
  const set = app.set;
  const navigate = useNavigate();
  const [step, setStep] = useState(session.b1_fallback_dinners || session.b1_skip ? 1 : 0);
  const [picked, setPicked] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [tooFew, setTooFew] = useState(false);
  const { ctx } = useWeek();
  const account = useSession()?.user?.id;
  // A visitor we already know (this device, or the account they log in with) never sees the survey again.
  useEffect(() => {
    if (step !== 0) return;
    let live = true;
    surveyDone().then((found) => { if (live && found) { useExp.getState().update({ b1_skip: "matched" }, true); setStep(1); } }).catch(() => {});
    return () => { live = false; };
  }, [step, account]);
  const prefs = prefsOf(app);
  const fitting = useMemo(() => (ctx.pool ?? []).filter((m) => fitsPrefs(m, prefs)), [ctx.pool, app.lifestyle, app.proteins, app.allergens]); // eslint-disable-line react-hooks/exhaustive-deps
  // Not all of them: a varied 15 across cuisines, proteins and meal types. Anything already picked stays in the list.
  const shown = useMemo(() => {
    const first = representative(fitting, 15, app.goals);
    return [...first, ...fitting.filter((m) => picked.includes(m.title) && !first.includes(m))];
  }, [fitting, app.goals]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    // The chosen dinners decide which kinds of dinner the week is built from.
    const types = [...new Set(fitting.filter((m) => picked.includes(m.title)).map((m) => m.type).filter((t): t is string => !!t))];
    useExp.getState().update({ survey_pre_completed: true }, true);
    if (session.ref && session.utm_source === "whatsapp_share") useExp.getState().track("referral_activated");
    set({ setupDone: true, ...(types.length ? { meals: types } : {}), ...(session.shared_plan_id ? {} : { mode: session.ab_plan_variant === "A_weekly_prep" ? "prep" : "daily" }) });
    useExp.getState().setTour(1);
    navigate({ to: "/" });
  };

  if (step === 0) return <PreSurvey onDone={() => { setStep(1); window.scrollTo({ top: 0 }); }} onSkip={(how) => { useExp.getState().update({ b1_skip: how }, true); setStep(1); window.scrollTo({ top: 0 }); }} />;
  const next = () => { setStep(step + 1); window.scrollTo({ top: 0 }); };
  const back = () => setStep(step - 1);
  const veg = app.lifestyle !== "none";

  const pickLifestyle = (l: "vegetarian" | "vegan") => set(app.lifestyle === l ? { lifestyle: "none", proteins: ALL_PROTEINS } : { lifestyle: l, proteins: [] });
  const pickProtein = (c: string) => {
    const base = veg ? [] : app.proteins;
    set({ lifestyle: "none", proteins: toggle(base, c) });
  };

  return (
    <div className="mx-auto my-8 max-w-2xl rounded-sheet bg-sheet p-6 sm:p-8">
      <style>{`@keyframes pr-bob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-4px) rotate(-6deg)}}.pr-bob{animation:pr-bob 1.6s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.pr-bob{animation:none}}`}</style>
      <PraticoLogo />
      <p className="eyebrow mt-6">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
      <div className="mt-2 flex gap-1" aria-hidden>{STEPS.map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-basil" : "bg-rule")} />)}</div>

      {step === 1 && (<>
        <h1 className="mt-6 text-[24px] font-bold">What do you want from your dinners?</h1>
        <p className="mt-2 text-muted-foreground">Pick any. We lean your week towards dinners labelled this way.</p>
        {session.b1_skip && (
          <div className="mt-5 border-b border-rule pb-5">
            <p className="text-[15.5px] font-semibold">Which supermarkets do you shop at?</p>
            <p className="text-[13px] font-medium text-muted-foreground">Pick one or more. We price each item at the cheapest of them.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {storeOptions.map((st) => (
                <button key={st} type="button" aria-label={st} aria-pressed={app.stores.includes(st)}
                  onClick={() => { const on = app.stores.includes(st); if (on && app.stores.length === 1) return; set({ stores: on ? app.stores.filter((x) => x !== st) : [...app.stores, st] }); }}
                  className={cn("press min-h-11 rounded-full p-1 ring-2", app.stores.includes(st) ? "ring-ink" : "ring-transparent hover:ring-rule")}>
                  <StoreBadge name={st} className="h-9 px-3" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">{GOALS.map((g) => <Chip key={g.code} on={app.goals.includes(g.code)} onClick={() => set({ goals: toggle(app.goals, g.code) })}>{g.label}</Chip>)}</div>
      </>)}

      {step === 2 && (<>
        <h1 className="mt-6 text-[24px] font-bold">Any allergies or intolerances?</h1>
        <p className="mt-2 text-muted-foreground">A dinner with an allergen you pick is never shown. Skip this if you have none.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ALLERGENS.map((a) => <Chip key={a.code} on={app.allergens.includes(a.code)} onClick={() => set({ allergens: toggle(app.allergens, a.code) })}>{a.label}</Chip>)}
          <Chip on={app.allergens.includes("lactose")} onClick={() => set({ allergens: toggle(app.allergens, "lactose") })}>Lactose intolerance</Chip>
        </div>
        <p className="mt-4 rounded-[6px] bg-sheet-2 p-3 text-[13.5px]">Always check the label on the pack. Allergen data for some recipes is still being completed, so with a serious allergy treat our filter as a help, not a guarantee.</p>
      </>)}

      {step === 3 && (<>
        <h1 className="mt-6 text-[24px] font-bold">Which animal proteins do you eat?</h1>
        <p className="mt-2 text-muted-foreground">Pick all that apply, or choose vegetarian or vegan.</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROTEINS.map((p) => {
            const on = !veg && app.proteins.includes(p.code);
            return (
              <button key={p.code} type="button" aria-pressed={on} onClick={() => pickProtein(p.code)}
                className={cn("press flex min-h-24 flex-col items-center justify-center gap-1 rounded-[8px] p-3 text-center text-[13.5px] font-medium", on ? "bg-basil text-basil-ink" : "bg-sheet-2 hover:bg-sheet-hover")}>
                <span aria-hidden className={cn("text-[30px]", on && "pr-bob")}>{ICON[p.code]}</span>{p.label}
              </button>
            );
          })}
          {(["vegetarian", "vegan"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={app.lifestyle === l} onClick={() => pickLifestyle(l)}
              className={cn("press flex min-h-24 flex-col items-center justify-center gap-1 rounded-[8px] p-3 text-center text-[13.5px] font-medium", app.lifestyle === l ? "bg-basil text-basil-ink" : "bg-sheet-2 hover:bg-sheet-hover")}>
              <span aria-hidden className={cn("text-[30px]", app.lifestyle === l && "pr-bob")}>{ICON[l]}</span>{l === "vegan" ? "Vegan" : "Vegetarian"}
            </button>
          ))}
        </div>
        {!veg && app.proteins.length === 0 && <p role="status" className="mt-3 text-[13.5px] font-semibold text-tomato">No animal protein picked: we will show vegetarian-style dinners only.</p>}
      </>)}

      {step === 4 && (<>
        <h1 className="mt-6 text-[24px] font-bold">Pick dinners you would cook</h1>
        <p className="mt-2 text-muted-foreground">Choose at least {MIN_MEALS}. Only dinners that fit your proteins and allergies are shown.</p>
        {fitting.length === 0 ? <p className="mt-5 text-[15px]">{ctx.live ? "No dinner fits these settings yet. Go back and relax one, or continue and we will tell you on Home." : "Loading dinners…"}</p> : (
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((m) => {
              const on = picked.includes(m.title);
              return (
                <li key={m.title}>
                  <button type="button" aria-pressed={on} onClick={() => { setPicked(toggle(picked, m.title)); setTooFew(false); }}
                    className={cn("press block w-full overflow-hidden rounded-[8px] text-left ring-2", on ? "ring-basil" : "ring-transparent")}>
                    {m.image ? <img src={m.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-sheet-2" />}
                    <span className={cn("block p-2 text-[13.5px] font-semibold", on && "bg-basil text-basil-ink")}>{on ? "✓ " : ""}{m.title}{m.cuisine && <span className="block text-[12px] font-medium opacity-70">{m.cuisine}</span>}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p role="status" className={cn("mt-3 text-[13.5px] font-semibold", tooFew ? "text-tomato" : "text-muted-foreground")}>{picked.length} picked{fitting.length >= MIN_MEALS ? `, ${MIN_MEALS} needed` : ""}</p>
      </>)}

      {step === 5 && (<>
        <h1 className="mt-6 text-[24px] font-bold">What is in your fridge?</h1>
        <p className="mt-2 text-muted-foreground">Optional. Items you have are left off your shopping list. You can also scan a receipt later on the Fridge page.</p>
        <ul className="mt-5 space-y-2">
          {app.fridge.map((f) => (
            <li key={f.id} className="flex min-h-11 items-center justify-between rounded-[6px] bg-sheet-2 px-3 text-[14.5px]">
              {f.name}
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => set({ fridge: app.fridge.filter((x) => x !== f) })} className="min-h-11 px-2 text-muted-foreground hover:text-ink">Remove</button>
            </li>
          ))}
          {app.fridge.length === 0 && <li className="text-[14.5px] text-muted-foreground">Nothing yet.</li>}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const name = newItem.trim(); if (!name) return; const slug = matchIngredient(name); if (slug && app.fridge.some((x) => x.id === slug)) { setNewItem(""); return; } set({ fridge: [...app.fridge, { id: slug ?? `manual-${Date.now()}`, name, daysLeft: null, maxDays: 7 }] }); setNewItem(""); }}>
          <label htmlFor="ob-fridge" className="sr-only">Add a fridge item</label>
          <input id="ob-fridge" value={newItem} maxLength={60} onChange={(e) => setNewItem(e.target.value)} placeholder="Add an item, e.g. milk" className="min-h-11 flex-1 rounded-ctl bg-sheet-2 px-3 text-[14.5px]" />
          <Button type="submit">Add</Button>
        </form>
      </>)}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        {step > 1 && <button type="button" onClick={back} className="min-h-11 px-2 text-[14.5px] font-medium underline underline-offset-4">Back</button>}
        {step < 5
          ? <Button onClick={() => { if (step === 4 && fitting.length >= MIN_MEALS && picked.length < MIN_MEALS) { setTooFew(true); return; } next(); }}>Continue</Button>
          : <Button onClick={finish}>Show my plan</Button>}
        {(step === 2 || step === 5) && <button type="button" onClick={step === 5 ? finish : next} className="min-h-11 px-2 text-[14.5px] font-medium text-muted-foreground underline underline-offset-4">{step === 5 ? "Skip fridge" : "I have none"}</button>}
      </div>
    </div>
  );
}
