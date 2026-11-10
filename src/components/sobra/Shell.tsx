import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChefHat, Refrigerator, ShoppingBasket, Tag, BookHeart } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { stores, type StoreName } from "@/data/stores";
import { SavingsCounter } from "./Savings";
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
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
      <label className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">My store</span>
        <select
          value={store}
          onChange={(e) => {
            const s = e.target.value as StoreName;
            set({ store: s, weekAccepted: false, swaps: {} });
            toast(`Plan rebuilt from ${s} deals.`);
          }}
          className="min-h-11 rounded-ctl bg-sheet-2 px-3 pr-8 text-[15px] font-semibold text-ink"
        >
          {stores.map((s) => <option key={s}>{s}</option>)}
        </select>
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

  useEffect(() => { useApp.persist.rehydrate(); }, []);
  useEffect(() => {
    if (hydrated && !setupDone && !isSetup) navigate({ to: "/setup" });
  }, [hydrated, setupDone, isSetup, navigate]);

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col px-5 py-7 md:flex">
        <Link to="/plan" className="font-hand text-[38px] font-bold leading-none text-basil" aria-label="sobra, go to plan">sobra</Link>
        <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
          {[...nav, { to: "/setup" as const, label: "Your meals", icon: BookHeart }].map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} aria-current={active ? "page" : undefined}
                className={cn("flex min-h-11 items-center gap-3 rounded-ctl px-3 text-[15px] font-medium transition-colors", active ? "bg-sheet text-ink" : "text-muted-foreground hover:text-ink")}>
                <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden />{label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto text-[12.5px] leading-snug text-muted-foreground">Prototype. Prices and deals are sample data entered by hand.</p>
      </aside>

      <div className="min-w-0 flex-1 px-2 pb-28 pt-2 md:px-6 md:py-6">
        <div className="flex items-center justify-between px-3 pb-2 pt-1 md:hidden">
          <span className="font-hand text-[30px] font-bold leading-none text-basil">sobra</span>
          <Link to="/setup" className="flex min-h-11 items-center text-[13px] font-medium text-muted-foreground">Your meals</Link>
        </div>
        <main className="sheet mx-auto max-w-[1000px] px-4 py-5 md:px-10 md:py-8">
          {!isSetup && <TopBar />}
          <div key={pathname} className={cn("fade-route", !isSetup && "pt-7")}>{children}</div>
        </main>
      </div>

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
