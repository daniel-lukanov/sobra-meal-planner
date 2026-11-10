import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChefHat, Refrigerator, ShoppingBasket, Tag, BookHeart } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { storeBrand, stores, type StoreName } from "@/data/stores";
import { SobraLogo, StoreDot } from "./Brand";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { SavingsCounter } from "./Savings";
import { useExp } from "@/lib/experiment";
import { PreSurvey } from "./PreSurvey";
import { MissionBar } from "./MissionBar";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/deals", label: "Deals", icon: Tag },
  { to: "/list", label: "List", icon: ShoppingBasket },
  { to: "/fridge", label: "Fridge", icon: Refrigerator },
  { to: "/cook", label: "Cook", icon: ChefHat },
] as const;

function TopBar() {
  const store = useApp((s) => s.store);
  const set = useApp((s) => s.set);
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <label className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">My store</span>
        <span className="relative inline-flex items-center rounded-full" style={{ backgroundColor: storeBrand[store].pill, color: "#1E1B18" }}>
        <StoreDot name={store} className="pointer-events-none absolute left-3" />
        <ShoppingBag className="pointer-events-none absolute left-7 size-4" strokeWidth={1.8} aria-hidden />
        <select
          value={store}
          onChange={(e) => {
            const s = e.target.value as StoreName;
            set({ store: s, weekAccepted: false, swaps: {} });
            toast(`Plan rebuilt from ${s} deals.`);
          }}
          className="min-h-11 appearance-none rounded-full bg-transparent pl-[52px] pr-9 text-[15px] font-semibold"
        >
          {stores.map((s) => <option key={s}>{s}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 size-4" aria-hidden />
        </span>
      </label>
      <SavingsCounter />
    </div>
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
  const showMission = !isInsights && !isSetup && !!session && (session.survey_pre_completed || skipped);

  useEffect(() => { useApp.persist.rehydrate(); useExp.persist.rehydrate(); }, []);
  // Assign the A/B variants once per visitor, and open /plan on the assigned tab.
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
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col px-5 py-7 md:flex">
        <Link to="/plan" aria-label="sobra, go to plan"><SobraLogo /></Link>
        <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
          {[...nav, { to: "/setup" as const, label: "Your meals", icon: BookHeart }].map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} aria-current={active ? "page" : undefined}
                className={cn("flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium transition-colors", active ? "bg-sheet text-ink shadow-[var(--shadow-card)] ring-1 ring-rule" : "text-muted-foreground hover:text-ink")}>
                <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden />{label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto text-[12.5px] leading-snug text-muted-foreground">Prototype. Prices and deals are sample data entered by hand.</p>
        <Link to="/insights" className="mt-3 flex min-h-9 items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-ink"><Lock className="size-3.5" aria-hidden />Founder insights</Link>
      </aside>

      <div className="min-w-0 flex-1 px-2 pb-28 pt-2 md:px-6 md:py-6">
        <div className="flex items-center justify-between px-3 pb-2 pt-1 md:hidden">
          <SobraLogo compact />
          <Link to="/setup" className="flex min-h-11 items-center text-[13px] font-medium text-muted-foreground">Your meals</Link>
        </div>
        <main className="mx-auto max-w-[1040px] px-2 py-3 md:px-4 md:py-2">
          {showSurvey ? <PreSurvey /> : (
            <>
              {!isSetup && !isInsights && <TopBar />}
              <div key={pathname} className={cn("fade-route", !isSetup && !isInsights && "pt-7", showMission && "pb-24")}>{children}</div>
            </>
          )}
        </main>
      </div>
      {showMission && !showSurvey && <MissionBar />}

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
    </div>
  );
}
