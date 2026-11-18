import { Link, Navigate, useLocation } from "@tanstack/react-router";
import { Ghost } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PraticoLogo } from "./Brand";
import { isGhost, useExp } from "@/lib/experiment";
import { detectLang, useLang } from "@/lib/i18n";
import { useSavings } from "@/lib/savings/store";
import { LangSwitch } from "@/components/savings/bits";

/** The meal-planner screens still exist in the code but nothing reaches them: these paths go back to the start. */
export const LEGACY_PREFIXES = ["/plan", "/deals", "/list", "/fridge", "/cook", "/recipe", "/setup", "/household", "/account", "/join", "/p/"];
export const isLegacyPath = (pathname: string) => LEGACY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isInsights = pathname.startsWith("/insights");
  const expHydrated = useExp((s) => s.hydrated);
  const session = useExp((s) => s.session);
  const [ghost, setGhost] = useState(false);
  useEffect(() => { setGhost(isGhost()); }, [pathname]);

  useEffect(() => { useExp.persist.rehydrate(); useSavings.persist.rehydrate(); useLang.setState({ lang: detectLang() }); document.documentElement.lang = detectLang() === "pt" ? "pt-PT" : "en"; }, []);
  // One session per visitor, created on the first visit, with the language they see.
  useEffect(() => {
    if (!expHydrated || isInsights || useExp.getState().session) return;
    const s = useExp.getState().ensure();
    useExp.getState().update({ lang: useLang.getState().lang });
    void s;
    sessionStorage.setItem("pratico-visit", "1");
  }, [expHydrated, isInsights, session]);
  // A returning visitor in a new browser session counts as a new visit.
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

  if (isLegacyPath(pathname)) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-rule bg-ground px-4 sm:px-8">
        <Link to="/" aria-label="pratico" className="shrink-0"><PraticoLogo compact /></Link>
        {!isInsights && <LangSwitch />}
      </header>
      <main className={isInsights ? "mx-auto max-w-6xl px-4 pb-32 pt-7 sm:px-8" : "mx-auto max-w-xl px-4 pb-24 pt-6 sm:px-6"}>
        <div key={pathname} className="fade-route">{children}</div>
      </main>
      {ghost && (
        <span className="fixed bottom-4 left-3 z-50 inline-flex items-center gap-1.5 rounded-[6px] bg-ink px-3 py-1.5 text-[12px] font-semibold text-sheet">
          <Ghost className="size-3.5" aria-hidden />Ghost Mode (Not Recording)
        </span>
      )}
    </div>
  );
}
