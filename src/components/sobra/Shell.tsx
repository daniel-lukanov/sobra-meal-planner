import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Check, BookHeart, CalendarDays, ChefHat, ChevronDown, Lock, Refrigerator, ShoppingBasket, Tag } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { stores, type StoreName } from "@/data/stores";
import { SobraLogo, StoreDot } from "./Brand";
import { SavingsCounter } from "./Savings";
import { useExp } from "@/lib/experiment";
import { PreSurvey } from "./PreSurvey";
import { MissionBar } from "./MissionBar";
import { GuidedTour } from "./GuidedTour";
import { isGhost } from "@/lib/experiment";
import { Ghost } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/deals", label: "Deals", icon: Tag },
  { to: "/list", label: "List", icon: ShoppingBasket },
  { to: "/fridge", label: "Fridge", icon: Refrigerator },
  { to: "/cook", label: "Cook", icon: ChefHat },
] as const;
const topNav = [...nav, { to: "/setup" as const, label: "Your meals", icon: BookHeart }];

function StorePicker() {
  const store = useApp((s) => s.store);
  const set = useApp((s) => s.set);
  const pick = (s: StoreName) => { if (s === store) return; set({ store: s, weekAccepted: false, swaps: {} }); toast(`Plan rebuilt from ${s} deals.`); };
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-label="My store" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 items-center gap-2 border-b border-ink/30 px-1 text-[14px] font-semibold text-ink outline-none hover:border-ink focus-visible:border-ink">
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline">Store</span>
        <span className="font-serif text-[17px] font-medium">{store}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-full z-50 mt-2 min-w-[200px] border border-rule bg-ground shadow-float">
          {stores.map((s) => (
            <li key={s} role="option" aria-selected={s === store}>
              <button type="button" onClick={() => { pick(s); setOpen(false); }}
                className={cn("flex w-full items-center justify-between border-b border-rule px-4 py-3 text-left font-serif text-[16px] hover:bg-sheet-2", s === store && "bg-sheet-2")}>
                <span className="flex items-center gap-3"><StoreDot name={s} />{s}</span>
                {s === store && <Check className="size-4" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopNav({ minimal }: { minimal: boolean }) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-rule bg-ground px-4 sm:px-8">
      <Link to="/plan" aria-label="sobra, go to plan" className="shrink-0"><SobraLogo compact /></Link>
      {!minimal && (
        <nav aria-label="Main" className="hidden h-full items-center gap-1 md:flex">
          {topNav.map(({ to, label }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} aria-current={active ? "page" : undefined}
                className={cn("flex h-full items-center border-b-2 px-3 text-[14.5px] transition-colors", active ? "border-basil font-semibold text-basil" : "border-transparent font-medium text-muted-foreground hover:text-ink")}>
                {label}
              </Link>
            );
          })}
        </nav>
      )}
      <div className="flex items-center gap-2">
        {!minimal && <><StorePicker /><SavingsCounter /></>}
        <Link to="/insights" aria-label="Founder insights" className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-sheet-2 hover:text-ink">
          <Lock className="size-4" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hydrated = useApp((s) => s.hydrated);
  const setupDone = useApp((s) => s.setupDone);
  const isSetup = pathname.startsWith("/setup");
  const isInsights = pathname.startsWith("/insights");
  const expHydrated = useExp((s) => s.hydrated);
  const session = useExp((s) => s.session);
  const skipped = useExp((s) => s.skipped);
  const showSurvey = !isInsights && expHydrated && !!session && !session.survey_pre_completed && !skipped;
  const tour = useExp((s) => s.tour);
  const showMission = !isInsights && !isSetup && !showSurvey && !!session && (session.survey_pre_completed || skipped);
  const [ghost, setGhost] = useState(false);
  useEffect(() => { setGhost(isGhost()); }, [pathname]);

  useEffect(() => { useApp.persist.rehydrate(); useExp.persist.rehydrate(); }, []);
  // Assign the variants once per visitor, and open /plan on the assigned tab.
  useEffect(() => {
    if (!hydrated || !expHydrated || isInsights || useExp.getState().session) return;
    const s = useExp.getState().ensure();
    useApp.getState().set({ mode: s.ab_plan_variant === "A_weekly_prep" ? "prep" : "daily" });
  }, [hydrated, expHydrated, isInsights, session]);
  useEffect(() => {
    if (hydrated && expHydrated && !setupDone && !isSetup && !isInsights && !showSurvey) navigate({ to: "/setup" });
  }, [hydrated, expHydrated, setupDone, isSetup, isInsights, showSurvey, navigate]);
  useEffect(() => {
    if (pathname.startsWith("/deals")) useExp.getState().track("deals_tab_visited");
    if (pathname.startsWith("/cook")) useExp.getState().track("cook_tab_visited");
  }, [pathname, session?.session_id]);
  useEffect(() => {
    if (isInsights || !session) return;
    const id = setInterval(() => {
      const cur = useExp.getState().session;
      if (cur && document.visibilityState === "visible") useExp.getState().update({ time_spent_seconds: cur.time_spent_seconds + 15 });
    }, 15000);
    return () => clearInterval(id);
  }, [isInsights, session?.session_id]);

  return (
    <div className="min-h-screen">
      <TopNav minimal={showSurvey || isInsights} />
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-7 sm:px-8">
        {showSurvey ? <PreSurvey /> : <div key={pathname} className="fade-route">{children}</div>}
      </main>
      {showMission && (tour ? <GuidedTour /> : <MissionBar />)}
      {ghost && (
        <span className="fixed bottom-20 left-3 z-50 inline-flex items-center gap-1.5 rounded-[6px] bg-ink px-3 py-1.5 text-[12px] font-semibold text-sheet md:bottom-4">
          <Ghost className="size-3.5" aria-hidden />Ghost Mode (Not Recording)
        </span>
      )}
      {!showSurvey && !isInsights && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-rule bg-sheet pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 text-[12px] font-medium", active ? "text-basil" : "text-muted-foreground")}>
                <Icon className="size-[22px]" strokeWidth={1.6} aria-hidden />{label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
