import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BookHeart, CalendarDays, ChefHat, ChevronDown, Lock, Refrigerator, ShoppingBag, ShoppingBasket, Tag } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { storeBrand, stores, type StoreName } from "@/data/stores";
import { SobraLogo, StoreDot } from "./Brand";
import { SavingsCounter } from "./Savings";
import { useExp } from "@/lib/experiment";
import { PreSurvey } from "./PreSurvey";
import { MissionBar } from "./MissionBar";
import { GuidedTour } from "./GuidedTour";
import { isGhost } from "@/lib/experiment";
import { Ghost } from "lucide-react";
import { useState } from "react";
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
  return (
    <label className="relative inline-flex shrink-0 items-center rounded-full" style={{ backgroundColor: storeBrand[store].pill, color: "#1D2A33" }}>
      <span className="sr-only">My store</span>
      <StoreDot name={store} className="pointer-events-none absolute left-3" />
      <ShoppingBag className="pointer-events-none absolute left-7 hidden size-4 sm:block" strokeWidth={1.8} aria-hidden />
      <select value={store}
        onChange={(e) => { const s = e.target.value as StoreName; set({ store: s, weekAccepted: false, swaps: {} }); toast(`Plan rebuilt from ${s} deals.`); }}
        className="min-h-10 appearance-none rounded-full bg-transparent pl-8 pr-8 text-[14px] font-semibold sm:pl-[52px]">
        {stores.map((s) => <option key={s}>{s}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4" aria-hidden />
    </label>
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
