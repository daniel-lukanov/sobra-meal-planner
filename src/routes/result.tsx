import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/pratico/ui";
import { StoreLogo } from "@/components/pratico/Brand";
import { BackLink, PriceNote, Progress } from "@/components/savings/bits";
import { Photo } from "@/components/savings/Photo";
import { ShareRow } from "@/components/savings/Share";
import { SurveyPrompt } from "@/components/savings/SurveyPrompt";
import { useExp } from "@/lib/experiment";
import { useT, type Key } from "@/lib/i18n";
import { weekKey } from "@/lib/savings/engine";
import { useSavings } from "@/lib/savings/store";
import { useResult } from "@/lib/savings/use-result";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/result")({ component: ResultScreen });

type Door = "loyalty" | "dinners" | "delivery";

function ResultScreen() {
  const { t, m, mw } = useT();
  const navigate = useNavigate();
  const hydrated = useSavings((s) => s.hydrated);
  const { res, manual } = useResult();
  const [all, setAll] = useState(false);
  const [door, setDoor] = useState<Door | null>(null);

  useEffect(() => { if (hydrated && !res) void navigate({ to: "/", replace: true }); }, [hydrated, res, navigate]);
  // Record what was shown, once per distinct result.
  useEffect(() => {
    const s = useExp.getState().session;
    if (!res || !s) return;
    if (s.result_saving === res.saving && s.result_total === res.total && s.events.some((e) => e.e === "result_shown")) return;
    useExp.getState().update({ result_saving: res.saving, result_percent: res.percent, result_total: res.total, result_cheapest_store: res.cheapestStore, result_user_store: res.userStore });
    useExp.getState().track("result_shown");
  }, [res]);

  if (!res) return <p className="mt-8 text-muted-foreground">{t("res.no_result")}</p>;
  const maxBasket = Math.max(...res.baskets.map((b) => b.total));
  const rows = all ? res.items.filter((i) => i.productId) : res.top;
  const name = (i: (typeof res.items)[number]) => i.line.name || (i.productId ? t(`p.${i.productId}` as Key) : i.line.raw);
  const toList = () => {
    const s = useExp.getState().session;
    const wk = weekKey();
    const blocked = !!s?.lists_made?.includes(wk);
    useExp.getState().track("list_cta_clicked");
    if (blocked) useExp.getState().track("second_list_blocked");
    else useExp.getState().update({ lists_made: [...(s?.lists_made ?? []), wk] }, true);
    useSavings.getState().set({ listBlocked: blocked });
    void navigate({ to: "/shopping-list" });
  };
  const tap = (d: Door) => { setDoor(d); useExp.getState().track(`fake_door_${d}` as const); };
  const doors: { d: Door; label: string }[] = [
    { d: "loyalty", label: t("res.fd.loyalty") }, { d: "dinners", label: t("res.fd.dinners") }, { d: "delivery", label: t("res.fd.delivery") },
  ];
  return (
    <div>
      <Progress step={3} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-medium text-muted-foreground">{t(manual ? "res.big_manual" : "res.big_receipt")}</p>
          <p className="font-serif text-[56px] font-medium leading-none text-basil" aria-live="polite">{m(res.saving)}</p>
        </div>
        <Photo src="/images/savings/coins.jpg" className="size-20 shrink-0" />
      </div>
      <p className="mt-3 text-[15.5px]">{t(manual ? "res.percent_manual" : "res.percent", { pct: res.percent, total: m(res.total), month: mw(res.monthly) })}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{t("res.compare")}</p>
      <PriceNote className="mt-1" />

      <section className="mt-5 rounded-sheet bg-basil-tint p-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-basil">{t("res.easiest_title")}</h2>
        <p className="mt-1 text-[15.5px]">{res.userIsCheapest ? t("res.already") : t("res.easiest", { store: res.cheapestStore, price: m(res.cheapestBasket), save: m(res.tripSaving) })}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-bold">{t("res.baskets")}</h2>
        <ul className="mt-3 space-y-2">
          {res.baskets.map((b) => (
            <li key={b.store}>
              <div className="flex items-center justify-between text-[14px]">
                <span className="flex items-center gap-2 font-medium">{b.store}
                  {b.store === res.cheapestStore && <span className="rounded-chip bg-basil-tint px-2 text-[12px] font-semibold text-basil">{t("res.cheapest")}</span>}
                  {b.store === res.userStore && <span className="rounded-chip bg-sheet-2 px-2 text-[12px] font-semibold text-muted-foreground">{t("res.yours")}</span>}</span>
                <span className="font-semibold">{m(b.total)}</span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-sheet-2"><div className={cn("h-full rounded-full", b.store === res.cheapestStore ? "bg-basil" : "bg-ink/40")} style={{ width: `${Math.max(6, (b.total / maxBasket) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-[17px] font-bold">{t("res.most")}</h2>
        <ul className="mt-2 divide-y divide-rule">
          {rows.map((i) => (
            <li key={i.line.id} className="py-3 text-[14.5px]">
              <div className="flex items-start justify-between gap-3"><span className="font-semibold">{name(i)}</span>
                {i.alreadyBest ? <span className="shrink-0 text-muted-foreground">{t("res.best_price")}</span> : <span className="shrink-0 font-bold text-basil">−{m(i.saving)}</span>}</div>
              {!i.alreadyBest && i.bestStore && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13.5px] text-muted-foreground">
                  <StoreLogo name={i.bestStore} className="h-4" /><span>{i.bestStore}, {t(`res.reason.${i.basis ?? "regular"}` as Key)}, {m(i.bestPrice)}</span>
                  {!manual && <span>· {t("res.paid", { price: m(i.paid) })}</span>}</p>
              )}
            </li>
          ))}
        </ul>
        {res.items.filter((i) => i.productId).length > 5 && (
          <Button variant="quiet" className="px-0" onClick={() => { if (!all) useExp.getState().track("show_all_clicked"); setAll(!all); }}>{all ? t("common.show_less") : t("common.show_all")}</Button>
        )}
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <Button className="w-full" onClick={toList}>{t("res.list")}</Button>
        <ShareRow res={res} manual={manual} primary={false} />
      </div>

      <ul className="mt-5 space-y-1">
        {doors.map(({ d, label }) => (
          <li key={d}><Button variant="quiet" className="px-0 text-left" onClick={() => tap(d)}>{label} ({t("res.soon")})</Button>
            {door === d && <p role="status" className="text-[13.5px] text-muted-foreground">{t("res.fd.thanks")}</p>}</li>
        ))}
      </ul>
      <div className="mt-3"><BackLink to={manual ? "/manual" : "/check"} label={t("common.back")} /></div>
      <SurveyPrompt />
    </div>
  );
}
