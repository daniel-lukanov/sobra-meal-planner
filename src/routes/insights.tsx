import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getInsights } from "@/lib/experiment.functions";
import type { ExperimentSession } from "@/lib/experiment-types";
import { useExp } from "@/lib/experiment";
import { getMockExperimentData } from "@/data/mockExperimentData";
import { fallbackOptions, featureOptions, receiptOptions, shortLabel, storeOptions, workaroundOptions } from "@/data/survey";
import { ctaTable, distribution, kpis, planTable, toCSV } from "@/lib/insights";
import { Button, UnderlineTabs } from "@/components/sobra/ui";
import { SobraLogo } from "@/components/sobra/Brand";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Founder insights · Sobra Lisboa" },
      { name: "description", content: "Private customer discovery and A/B test results for the Sobra team." },
      { property: "og:title", content: "Founder insights · Sobra Lisboa" },
      { property: "og:description", content: "Private customer discovery and A/B test results for the Sobra team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Insights,
});

const KEY = "sobra-insights-pass";

function Insights() {
  const fetchInsights = useServerFn(getInsights);
  const [pass, setPass] = useState("");
  const [rows, setRows] = useState<ExperimentSession[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const unlock = async (code: string, silent = false) => {
    setBusy(true);
    try {
      const res = await fetchInsights({ data: { passcode: code } });
      if (res.ok) { sessionStorage.setItem(KEY, code); setRows(res.rows); setError(false); }
      else { sessionStorage.removeItem(KEY); if (!silent) setError(true); }
    } catch { if (!silent) toast("Could not load responses. Try again in a moment."); }
    finally { setBusy(false); }
  };
  useEffect(() => { const saved = sessionStorage.getItem(KEY); if (saved) void unlock(saved, true); }, []);

  if (!rows) {
    return (
      <div className="mx-auto mt-10 max-w-[420px]">
        <form className="card p-6" onSubmit={(e) => { e.preventDefault(); void unlock(pass); }}>
          <SobraLogo />
          <h1 className="mt-6 flex items-center gap-2 text-[24px] font-bold"><Lock className="size-5 text-muted-foreground" aria-hidden />Founder insights</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Enter the team passcode to see the study results.</p>
          <label htmlFor="pass" className="sr-only">Passcode</label>
          <input id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" className="mt-4 min-h-11 w-full rounded-[12px] bg-sheet-2 px-3" />
          {error && <p role="alert" className="mt-2 text-[13.5px] text-tomato">That passcode is not right.</p>}
          <Button type="submit" className="mt-4 w-full" disabled={busy || !pass}>{busy ? "Checking" : "Unlock"}</Button>
        </form>
      </div>
    );
  }
  return <Dashboard live={rows} />;
}

function Dashboard({ live }: { live: ExperimentSession[] }) {
  const [mode, setMode] = useState<"live" | "combined">("combined");
  const rows = useMemo(() => (mode === "live" ? live : [...live, ...getMockExperimentData()]), [mode, live]);
  const k = kpis(rows);
  const plan = planTable(rows);
  const cta = ctaTable(rows);
  const pains = distribution(rows, "top_pain");
  const fallback = distribution(rows, "fallback_nights", fallbackOptions);
  const work = distribution(rows, "current_workaround", workaroundOptions);
  const stores = distribution(rows, "preferred_store", storeOptions);
  const feat = distribution(rows, "winning_feature", featureOptions);
  const rec = distribution(rows, "receipt_willingness", receiptOptions);
  const heavy = fallback.filter((f) => f.label === "3–4 nights" || f.label === "5+ nights").reduce((a, f) => a + f.pct, 0);
  const [A, B] = plan; const [C1, C2] = cta;
  const planWin = A!.acceptance >= B!.acceptance ? A! : B!;
  const ctaWin = C1!.primary >= C2!.primary ? C1! : C2!;
  const cashbackReceipt = rec.find((r) => r.label.startsWith("Only if"))?.pct ?? 0;

  const download = () => {
    const blob = new Blob([toCSV(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sobra-experiment-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const resetMine = () => {
    useExp.getState().reset();
    localStorage.removeItem("sobra-experiment-v1");
    localStorage.removeItem("sobra-v1");
    toast("Your test session is cleared. Open the app to take the survey again.");
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Católica Lisbon NVC Study · private</p>
          <h1 className="mt-1 text-[30px] font-bold md:text-[34px]">Founder insights</h1>
        </div>
        <UnderlineTabs label="Data mode" value={mode} onChange={setMode} options={[
          { value: "live", label: "Live Responses Only" },
          { value: "combined", label: "Combined View (28 Pre-Seeded Lisbon Student Responses + Live)" },
        ]} />
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Total respondents" value={`${k.n}`} />
        <Kpi label="Survey completion" value={`${k.completion}%`} />
        <Kpi label="Overall CTA conversion" value={`${k.ctaConversion}%`} />
        <Kpi label="Avg time explored" value={`${k.avgTime}s`} />
        <Kpi label="Top validated pain" value={k.topPain ? `${k.topPain.pct}%` : "–"} sub={k.topPain?.label} />
      </section>

      <Section title="Testing the circle" sub="Customer discovery: what hurts, and what people do today.">
        <div className="grid gap-4 md:grid-cols-2">
          <Bars title="Top frustrations ranked" items={pains.map((p) => ({ ...p, label: shortLabel(p.label) }))} tone="tomato" />
          <Bars title="Nights per week falling back to pasta or delivery" items={fallback} tone="mustard" />
          <Bars title="Current workarounds" items={work} tone="basil" />
          <Bars title="Supermarket share in Lisbon" items={stores} tone="basil" />
        </div>
      </Section>

      <Section title="Testing the square" sub="Two A/B tests running at the same time, each split 50/50.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Table title="Product mode A/B" head={["", "Variant A (Weekly Prep Default)", "Variant B (Daily Pick Default)"]} rows={[
            ["Visitors (n)", `${A!.n}`, `${B!.n}`],
            ["Plan acceptance rate", `${A!.acceptance}%`, `${B!.acceptance}%`],
            ["Mode switch rate", `${A!.switched}%`, `${B!.switched}%`],
            ["Synergy pill clicks", `${A!.synergy}%`, `${B!.synergy}%`],
            ["Final conversion", `${A!.conversion}%`, `${B!.conversion}%`],
          ]} />
          <Table title="Business model / willingness to pay A/B" head={["", "Variant 1 (Free + €2.00 Receipt Cashback)", "Variant 2 (€1.99/mo Student Pass)"]} rows={[
            ["Visitors (n)", `${C1!.n}`, `${C2!.n}`],
            ["Primary CTA click rate", `${C1!.primary}%`, `${C2!.primary}%`],
            ["Contact info left", `${C1!.contact}%`, `${C2!.contact}%`],
          ]} />
          <Bars title="Feature value vote" items={feat.map((f) => ({ ...f, label: shortLabel(f.label) }))} tone="basil" />
          <Bars title="Receipt habit" items={rec} tone="mustard" />
        </div>
      </Section>

      <Section title="Test cards and learning cards" sub="Filled in from the numbers above, ready to screenshot into the slides.">
        <div className="grid gap-4 lg:grid-cols-3">
          <LearnCard n={1} hypothesis="We believe Lisbon students fall back to pasta or delivery because they have no plan for the week."
            test={`Pre-prototype survey, n = ${k.preCount}. Metric: share reporting 3 or more fallback nights.`}
            observation={`${heavy}% fell back 3 or more nights last week. Top pain: ${k.topPain?.label ?? "no data yet"} (${k.topPain?.pct ?? 0}%).`}
            learning={heavy >= 40 ? "The problem is real and frequent. Keep the plan as the core promise and lead the pitch with it." : "Fallback nights are less common than assumed. Talk to more students before building more."} />
          <LearnCard n={2} hypothesis="Students accept a plan more often when the app opens on Weekly prep than on Daily pick."
            test={`Product mode A/B, ${A!.n} vs ${B!.n} visitors. Metric: plan acceptance rate.`}
            observation={`Weekly prep ${A!.acceptance}% vs Daily pick ${B!.acceptance}%. Mode switch rate ${A!.switched}% vs ${B!.switched}%.`}
            learning={`${planWin.variant === "A_weekly_prep" ? "Weekly prep" : "Daily pick"} wins for now. Make it the default and run a bigger sample to confirm.`} />
          <LearnCard n={3} hypothesis="Students engage more with a free cashback pilot than with a €1.99 monthly pass."
            test={`Business model A/B, ${C1!.n} vs ${C2!.n} visitors. Metric: primary CTA click rate.`}
            observation={`Cashback ${C1!.primary}% vs paid pass ${C2!.primary}%. ${cashbackReceipt}% would only scan receipts for cashback.`}
            learning={`${ctaWin.variant === "1_receipt_cashback" ? "Cashback pulls harder. Fund the concierge pilot with brand partners first" : "Students will pay. Test the €1.99 pass with a real checkout next"}.`} />
        </div>
      </Section>

      <div className="card flex flex-wrap gap-2 p-4">
        <Button onClick={download}><Download className="size-4" aria-hidden />Download CSV for R / Python</Button>
        <Button variant="secondary" onClick={resetMine}><RotateCcw className="size-4" aria-hidden />Reset My Test Session</Button>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="card p-4">
      <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <p className="num mt-1 font-serif text-[28px] font-bold leading-none">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[22px] font-bold">{title}</h2>
      <p className="mb-4 text-[14px] text-muted-foreground">{sub}</p>
      {children}
    </section>
  );
}
const toneBg = { basil: "bg-basil", tomato: "bg-tomato", mustard: "bg-mustard" } as const;
function Bars({ title, items, tone }: { title: string; items: { label: string; count: number; pct: number }[]; tone: keyof typeof toneBg }) {
  return (
    <div className="card p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>
      {items.length === 0 ? <p className="mt-3 text-[14px] text-muted-foreground">No answers yet.</p> : (
        <ul className="mt-3 space-y-3">
          {items.map((it) => (
            <li key={it.label}>
              <div className="flex justify-between gap-3 text-[13.5px]"><span>{it.label}</span><span className="num shrink-0 font-semibold">{it.pct}% <span className="font-normal text-muted-foreground">({it.count})</span></span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-sheet-2"><div className={`h-full rounded-full ${toneBg[tone]}`} style={{ width: `${it.pct}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <div className="card overflow-x-auto p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>
      <table className="num mt-3 w-full text-[13.5px]">
        <thead><tr className="border-b border-rule text-left text-muted-foreground">{head.map((h, i) => <th key={i} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]} className="border-b border-rule last:border-0">{r.map((c, i) => <td key={i} className={i === 0 ? "py-2 pr-3" : "py-2 pr-3 font-serif text-[16px] font-bold"}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function LearnCard({ n, hypothesis, test, observation, learning }: { n: number; hypothesis: string; test: string; observation: string; learning: string }) {
  const rows: [string, string][] = [["Hypothesis", hypothesis], ["Test & metric", test], ["Observation", observation], ["Learning & next action", learning]];
  return (
    <article className="card p-5">
      <span className="tape">Card {n}</span>
      <dl className="mt-4 space-y-3">
        {rows.map(([t, d]) => (
          <div key={t}><dt className="text-[12.5px] font-semibold text-muted-foreground">{t}</dt><dd className="mt-0.5 text-[14px] leading-snug">{d}</dd></div>
        ))}
      </dl>
    </article>
  );
}
