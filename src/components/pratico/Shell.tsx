import { Link, useLocation } from "@tanstack/react-router";
import { House, Refrigerator, ShoppingBasket, Tag } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { PraticoLogo } from "./Brand";
import { UserMenu } from "./UserMenu";
import { useExp } from "@/lib/experiment";
import { PreSurvey } from "./PreSurvey";
import { FeedbackPill } from "./VerdictModal";
import { GuidedTour } from "./GuidedTour";
import { isGhost } from "@/lib/experiment";
import { Ghost } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useHouseholdSync } from "@/lib/household-sync";

const nav = [
  { to: "/", label: "Home", icon: House },
  { to: "/deals", label: "Deals", icon: Tag },
  { to: "/list", label: "List", icon: ShoppingBasket },
  { to: "/fridge", label: "Fridge", icon: Refrigerator },
] as const;
const topNav = nav;

function TopNav({ minimal }: { minimal: boolean }) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-rule bg-ground px-4 sm:px-8">
      <Link to="/" aria-label="pratico, go to Home" className="shrink-0"><PraticoLogo compact /></Link>
      {!minimal && (
        <nav aria-label="Main" className="hidden h-full items-center gap-1 md:flex">
          {topNav.map(({ to, label }) => {
            const active = to === "/" ? pathname === "/" || pathname.startsWith("/recipe") || pathname.startsWith("/cook") : pathname.startsWith(to);
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
        <UserMenu />
      </div>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useHouseholdSync();
  const hydrated = useApp((s) => s.hydrated);
  const isInsights = pathname.startsWith("/insights");
  const expHydrated = useExp((s) => s.hydrated);
  const session = useExp((s) => s.session);
  const isShared = pathname.startsWith("/p/") || pathname.startsWith("/join/");
  const showSurvey = !isInsights && !isShared && expHydrated && !!session && !session.survey_pre_completed;
  const showStudy = !isInsights && !isShared && !showSurvey && !!session?.survey_pre_completed;
  const [ghost, setGhost] = useState(false);
  useEffect(() => { setGhost(isGhost()); }, [pathname]);

  useEffect(() => { useApp.persist.rehydrate(); useExp.persist.rehydrate(); }, []);
  // Assign the variants once per visitor, and open /plan on the assigned tab.
  useEffect(() => {
    if (!hydrated || !expHydrated || isInsights || useExp.getState().session) return;
    const s = useExp.getState().ensure();
    useApp.getState().set({ mode: s.ab_plan_variant === "A_weekly_prep" ? "prep" : "daily" });
    sessionStorage.setItem("pratico-visit", "1");
  }, [hydrated, expHydrated, isInsights, session]);
  // A returning visitor in a new browser session counts as a new visit, so later actions are not first-session.
  useEffect(() => {
    if (!expHydrated || isInsights || sessionStorage.getItem("pratico-visit")) return;
    const cur = useExp.getState().session;
    sessionStorage.setItem("pratico-visit", "1");
    if (cur) useExp.getState().update({ visits: cur.visits + 1, first_session: false });
  }, [expHydrated, isInsights]);
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
      <TopNav minimal={showSurvey || isInsights || isShared} />
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-7 sm:px-8">
        {showSurvey ? <PreSurvey /> : <div key={pathname} className="fade-route">{children}</div>}
      </main>
      {showStudy && <><GuidedTour /><FeedbackPill /></>}
      {ghost && (
        <span className="fixed bottom-20 left-3 z-50 inline-flex items-center gap-1.5 rounded-[6px] bg-ink px-3 py-1.5 text-[12px] font-semibold text-sheet md:bottom-4">
          <Ghost className="size-3.5" aria-hidden />Ghost Mode (Not Recording)
        </span>
      )}
      {!showSurvey && !isInsights && !isShared && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-rule bg-sheet pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" || pathname.startsWith("/recipe") || pathname.startsWith("/cook") : pathname.startsWith(to);
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
