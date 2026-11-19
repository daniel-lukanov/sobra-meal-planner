import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/pratico/ui";
import { StoreBadge } from "@/components/pratico/Brand";
import { PriceNote } from "@/components/savings/bits";
import { CtaCard } from "@/components/savings/CtaCard";
import { Photo } from "@/components/savings/Photo";
import { SurveyPrompt } from "@/components/savings/SurveyPrompt";
import { useT, type Key } from "@/lib/i18n";
import { shoppingList } from "@/lib/savings/engine";
import { useSavings } from "@/lib/savings/store";
import { useResult } from "@/lib/savings/use-result";

export const Route = createFileRoute("/shopping-list")({ component: ListScreen });

function ListScreen() {
  const { t, m } = useT();
  const navigate = useNavigate();
  const hydrated = useSavings((s) => s.hydrated);
  const blocked = useSavings((s) => s.listBlocked);
  const { res } = useResult();
  useEffect(() => { if (hydrated && !res) void navigate({ to: "/", replace: true }); }, [hydrated, res, navigate]);
  if (!res) return null;
  if (blocked) {
    return (
      <div>
        <h1 className="font-serif text-[26px] font-medium">{t("list.blocked_title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("list.blocked_text")}</p>
        <div className="mt-5"><CtaCard /></div>
        <Link to="/result" className="mt-3 inline-block py-2 text-[14px] font-medium text-muted-foreground hover:text-ink">← {t("list.back")}</Link>
      </div>
    );
  }
  const groups = shoppingList(res);
  return (
    <div>
      <Photo src="/images/savings/list.jpg" className="mb-5 h-28 sm:h-36" />
      <h1 className="font-serif text-[28px] font-medium">{t("list.title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("list.sub")}</p>
      <PriceNote className="mt-1" />
      {groups.map((g) => (
        <section key={g.store} className="mt-6">
          <div className="flex items-center justify-between"><StoreBadge name={g.store} /><span className="text-[14px] font-semibold">{t("list.total", { store: g.store })}: {m(g.total)}</span></div>
          {g.sections.map((s) => (
            <div key={s.section} className="mt-3">
              <h2 className="eyebrow">{t(`sec.${s.section}` as Key)}</h2>
              <ul className="divide-y divide-rule">
                {s.items.map((i) => (
                  <li key={i.line.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[14.5px]">
                    <span>{i.line.name || t(`p.${i.productId}` as Key)}</span>
                    <span className="shrink-0 text-right">{m(i.bestPrice)}{i.saving > 0 && <span className="ml-2 text-[13px] font-semibold text-basil">{t("list.save", { amount: m(i.saving) })}</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <Button className="mt-8 w-full" onClick={() => void navigate({ to: "/finish" })}>{t("fin.continue")}</Button>
      <Link to="/result" className="mt-2 inline-block py-2 text-[14px] font-medium text-muted-foreground hover:text-ink">← {t("list.back")}</Link>
      <SurveyPrompt delayMs={1500} />
    </div>
  );
}
