import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { pageHead } from "@/lib/head";
import { stores } from "@/data/stores";
import { mealOptions } from "@/data/plan";
import { ALLERGENS, ALL_PROTEINS, GOALS, INTOLERANCES, PROTEINS, type Lifestyle } from "@/lib/prefs";
import { StoreBadge } from "@/components/pratico/Brand";
import { categoryPhoto } from "@/data/photos";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useHousehold, useSession } from "@/lib/account";
import { AccountForm } from "@/components/pratico/AccountForm";
import { Button } from "@/components/pratico/ui";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/account")({
  head: pageHead("Account", "Your account, supermarkets, what you eat, what you avoid and what you want from your dinners."),
  component: Account,
});

function Toggle({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-[6px] px-4 text-left text-[15px] font-medium", on ? "bg-ink text-sheet" : "bg-sheet-2 text-ink hover:bg-sheet-hover", className)}>
      {children}
    </button>
  );
}

function Block({ id, title, hint, aside, children }: { id: string; title: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-6" aria-labelledby={id}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 id={id} className="text-[18px]">{title}</h2>
          {hint && <p className="mt-1 text-[13.5px] text-muted-foreground">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

type Draft = Pick<ReturnType<typeof useApp.getState>, "stores" | "lifestyle" | "proteins" | "allergens" | "goals" | "mode" | "meals">;
const pick = (s: Draft): Draft => ({ stores: s.stores, lifestyle: s.lifestyle, proteins: s.proteins, allergens: s.allergens, goals: s.goals, mode: s.mode, meals: s.meals });

function Account() {
  const saved = useApp();
  const session = useSession();
  const [d, setD] = useState<Draft>(() => pick(saved));
  // Changes are held here until Save. Settings that change what the plan shows rebuild the plan on save.
  const dirty = JSON.stringify(d) !== JSON.stringify(pick(saved));
  const [asking, setAsking] = useState(false);
  const blocker = useBlocker({ shouldBlockFn: () => dirty, withResolver: true, enableBeforeUnload: () => dirty, disabled: !dirty });
  useEffect(() => { if (blocker.status === "blocked") setAsking(true); }, [blocker.status]);
  const save = () => {
    saved.set({ ...d, chosen: {}, weekAccepted: false });
    toast("Saved. Your plan now follows these settings.");
  };
  const cancel = () => setD(pick(saved));
  const s = d;
  const change = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const veg = s.lifestyle !== "none";
  const setLifestyle = (l: Lifestyle) => change({ lifestyle: l, proteins: l === "none" ? ALL_PROTEINS : [] });
  const allergyCodes = new Set<string>(ALLERGENS.map((a) => a.code));
  const user = session?.user;
  const mates = (useHousehold(user?.id).data?.members.length ?? 1) - 1;

  return (
    <div className="mx-auto max-w-[860px]">
      <p className="text-[13px] font-medium text-muted-foreground">Account</p>
      <h1 className="mt-1 text-[28px] font-bold md:text-[36px]">Your account</h1>
      <p className="mt-2 pb-6 text-muted-foreground">Change anything at any time, then press Save. Your plan updates to match.</p>

      <section className="border-t border-rule py-6" aria-labelledby="who">
        <h2 id="who" className="text-[18px]">Sign in</h2>
        {session === undefined ? <p className="mt-2 text-muted-foreground">One moment.</p> : user ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="text-[15.5px] font-medium">Signed in as {user.email?.split("@")[0]}</span>
            <button type="button" onClick={() => void signOut()} className="min-h-11 text-muted-foreground underline underline-offset-4">Sign out</button>
          </div>
        ) : <div className="mt-3 max-w-md rounded-sheet bg-sheet p-5"><AccountForm /></div>}
      </section>

      {mates > 0 && (
        <p role="note" className="mb-2 rounded-sheet bg-sheet p-4 text-[14px]">
          You share your plan with {mates === 1 ? "1 other person" : `${mates} other people`}. The plan uses the strictest diet and every allergy in your household, so it can exclude more than your own settings below. Stores are shared too. Your own settings stay yours.
        </p>
      )}

      <Block id="stores" title="Where does your household shop?" hint="Pick one or more. Each item is priced at the cheapest of your stores, and the shopping list is grouped by store.">
        <div className="flex flex-wrap gap-2">
          {stores.map((st) => {
            const on = s.stores.includes(st);
            return (
              <button key={st} type="button" aria-label={st} aria-pressed={on} onClick={() => {
                if (on && s.stores.length === 1) { toast("Keep at least one store."); return; }
                change({ stores: on ? s.stores.filter((x) => x !== st) : [...s.stores, st] });
              }} className={cn("press min-h-11 rounded-full p-1 ring-2", on ? "ring-ink" : "ring-transparent hover:ring-rule")}>
                <StoreBadge name={st} className="h-9 px-3" />
              </button>
            );
          })}
        </div>
      </Block>

      <Block id="eat" title="What do you eat?">
        <div className="flex flex-wrap gap-2">
          <Toggle on={s.lifestyle === "none"} onClick={() => setLifestyle("none")}>I eat animal products</Toggle>
          <Toggle on={s.lifestyle === "vegetarian"} onClick={() => setLifestyle("vegetarian")}>Vegetarian</Toggle>
          <Toggle on={s.lifestyle === "vegan"} onClick={() => setLifestyle("vegan")}>Vegan</Toggle>
        </div>
        <p className="mt-5 mb-2 text-[14px] font-semibold">Animal proteins you eat</p>
        <div className="flex flex-wrap gap-2" aria-disabled={veg}>
          {PROTEINS.map((p) => (
            <Toggle key={p.code} on={!veg && s.proteins.includes(p.code)} className={veg ? "pointer-events-none opacity-50" : ""}
              onClick={() => change({ proteins: toggleIn(s.proteins, p.code) })}>{p.label}</Toggle>
          ))}
        </div>
        {veg && <p className="mt-2 text-[13.5px] text-muted-foreground">{s.lifestyle === "vegan" ? "Vegan: no meat, fish, eggs or dairy." : "Vegetarian: no meat or fish. Eggs and dairy are fine."}</p>}
      </Block>

      <Block id="allergies" title="Allergies and intolerances" hint="We never show a dinner that contains one of these.">
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => <Toggle key={a.code} on={s.allergens.includes(a.code)} onClick={() => change({ allergens: toggleIn(s.allergens, a.code) })}>{a.label}</Toggle>)}
          {INTOLERANCES.filter((i) => !allergyCodes.has(i.code) || i.code !== "gluten").map((i) => <Toggle key={i.code} on={s.allergens.includes(i.code)} onClick={() => change({ allergens: toggleIn(s.allergens, i.code) })}>{i.label}</Toggle>)}
        </div>
        <p className="mt-3 text-[13.5px] text-muted-foreground">Always check the label of what you buy. Product recipes and brands change, and we match on ingredients, not on the packaging.</p>
      </Block>

      <Block id="goals" title="What do you want from your dinners?" hint="Pick any. These rank dinners, they never hide the ones that fit your food choices.">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => <Toggle key={g.code} on={s.goals.includes(g.code)} onClick={() => change({ goals: toggleIn(s.goals, g.code) })}>{g.label}</Toggle>)}
        </div>
      </Block>

      <Block id="mode" title="How do you want to cook?">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle className="rounded-[8px] py-3" on={s.mode === "prep"} onClick={() => change({ mode: "prep" })}>
            <span className="block font-semibold">Weekly prep</span>
            <span className="block text-[13px] opacity-80">Cook a base twice a week, eat something different each day.</span>
          </Toggle>
          <Toggle className="rounded-[8px] py-3" on={s.mode === "daily"} onClick={() => change({ mode: "daily" })}>
            <span className="block font-semibold">Daily pick</span>
            <span className="block text-[13px] opacity-80">Choose 1 of 3 quick dinners each evening, about 20 to 30 min.</span>
          </Toggle>
        </div>
      </Block>

      <Block id="meals" title="Which meals do you like?" aside={<span className="num text-[13px] text-muted-foreground" aria-live="polite">{s.meals.length} of 12</span>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {mealOptions.map((m) => {
            const on = s.meals.includes(m);
            return (
              <button key={m} type="button" aria-pressed={on} onClick={() => {
                if (!on && s.meals.length >= 12) { toast("You have 12 meals. Remove one first."); return; }
                change({ meals: toggleIn(s.meals, m) });
              }} className={cn("card press group relative overflow-hidden p-2 text-left", on && "border-basil")}>
                <div className="aspect-[4/3] overflow-hidden rounded-[8px] bg-sheet-2">
                  <img src={categoryPhoto[m]} alt="" width={300} height={225} loading="lazy" className={cn("size-full object-cover transition", !on && "opacity-80 saturate-[.8]")} />
                </div>
                <span className={cn("absolute right-3.5 top-3.5 flex size-7 items-center justify-center rounded-full transition", on ? "bg-basil text-basil-ink" : "bg-sheet/90 text-muted-foreground")} aria-hidden>
                  {on ? <Check className="size-4" strokeWidth={2.4} /> : <span className="size-3 rounded-full ring-2 ring-current" />}
                </span>
                <span className="mt-2 block px-1 pb-0.5 text-[16px] font-semibold">{m}</span>
              </button>
            );
          })}
        </div>
      </Block>

      <div className="sticky bottom-20 z-30 -mx-4 flex flex-wrap items-center gap-3 border-t border-rule bg-ground px-4 py-4 sm:-mx-8 sm:px-8 md:bottom-0">
        <Button onClick={save} disabled={!dirty}>Save</Button>
        <Button variant="secondary" onClick={cancel} disabled={!dirty}>Cancel</Button>
        <span role="status" className="text-[13.5px] text-muted-foreground">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <Link to="/" className="ml-auto text-[14px] underline underline-offset-4">See my plan</Link>
      </div>

      <AlertDialog open={asking} onOpenChange={(o) => { if (!o) { setAsking(false); if (blocker.status === "blocked") blocker.reset(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your changes?</AlertDialogTitle>
            <AlertDialogDescription>You changed your settings but did not save them yet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="quiet" onClick={() => { setAsking(false); if (blocker.status === "blocked") blocker.reset(); }}>Keep editing</Button>
            <Button variant="secondary" onClick={() => { setAsking(false); cancel(); setTimeout(() => blocker.status === "blocked" && blocker.proceed(), 0); }}>Discard changes</Button>
            <Button onClick={() => { save(); setAsking(false); setTimeout(() => blocker.status === "blocked" && blocker.proceed(), 0); }}>Save and leave</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
