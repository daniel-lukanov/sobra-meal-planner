import { Link } from "@tanstack/react-router";
import { ChevronDown, Lock, User, UserRound, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/account";
import { cn } from "@/lib/utils";

/** Top-right menu: who you are, and the way to Account (your food settings), Household and the admin login. */
export function UserMenu() {
  const session = useSession();
  const user = session?.user;
  const meta = user?.user_metadata as { name?: string; full_name?: string } | undefined;
  const name = meta?.name ?? meta?.full_name ?? user?.email?.split("@")[0] ?? "Guest";
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
  const items = [
    { to: "/account" as const, label: user ? "Account" : "Register or log in", icon: UserRound },
    { to: "/household" as const, label: "Household", icon: Users },
    { to: "/insights" as const, label: "Admin login", icon: Lock },
  ];
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-[14px] font-semibold text-ink hover:bg-sheet-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-basil-tint text-basil"><User className="size-4" aria-hidden /></span>
        <span className="max-w-[9rem] truncate">{name}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-50 mt-2 min-w-[200px] border border-rule bg-ground shadow-float">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={label} role="none">
              <Link to={to} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 border-b border-rule px-4 text-[14.5px] hover:bg-sheet-2">
                <Icon className="size-4 text-muted-foreground" aria-hidden />{label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
