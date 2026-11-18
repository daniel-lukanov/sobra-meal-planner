import { Link } from "@tanstack/react-router";
import { useLang, useT, type Lang } from "@/lib/i18n";
import { useExp } from "@/lib/experiment";
import { cn } from "@/lib/utils";

export function LangSwitch() {
  const { lang, t } = useT();
  const set = useLang((s) => s.set);
  const pick = (l: Lang) => { if (l === lang) return; set(l); useExp.getState().update({ lang: l }); useExp.getState().track("language_changed"); };
  return (
    <div role="group" aria-label={t("lang.switch")} className="inline-flex overflow-hidden rounded-[6px] border border-rule text-[13px] font-semibold">
      {(["en", "pt"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => pick(l)}
          className={cn("min-h-9 px-3", lang === l ? "bg-basil text-basil-ink" : "bg-sheet text-muted-foreground hover:text-ink")}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}

/** Your shop / Check / Savings. */
export function Progress({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useT();
  const labels = [t("nav.steps.shop"), t("nav.steps.check"), t("nav.steps.savings")];
  return (
    <ol aria-label="Progress" className="mb-6 flex gap-2">
      {labels.map((l, i) => (
        <li key={l} aria-current={i + 1 === step ? "step" : undefined} className="flex-1">
          <div className={cn("h-1.5 rounded-full", i + 1 <= step ? "bg-basil" : "bg-sheet-2")} />
          <span className={cn("mt-1.5 block text-[12.5px]", i + 1 === step ? "font-semibold text-ink" : "text-muted-foreground")}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

export function PriceNote({ className }: { className?: string }) {
  const { t } = useT();
  return <p className={cn("text-[12.5px] text-muted-foreground", className)}>{t("price.note")}</p>;
}

export function BackLink({ to, label }: { to: "/" | "/check" | "/manual" | "/result"; label: string }) {
  return <Link to={to} className="inline-block py-2 text-[14px] font-medium text-muted-foreground hover:text-ink">← {label}</Link>;
}

/** Scrolls to and focuses a field or question, used when something required is missing. */
export function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const f = el.matches("button,input,select,textarea") ? el : el.querySelector<HTMLElement>("button,input,select,textarea");
  f?.focus({ preventScroll: true });
}
