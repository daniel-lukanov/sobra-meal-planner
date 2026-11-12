import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Ghost, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { adminDeleteSessions, adminSaveSession, getInsights } from "@/lib/experiment.functions";
import type { ExperimentSession } from "@/lib/experiment-types";
import { GHOST_KEY, useExp } from "@/lib/experiment";
import { Switch } from "@/components/ui/switch";
import { SessionExplorer } from "@/components/sobra/SessionExplorer";
import { tasksDone } from "@/lib/experiment-types";
import { getMockExperimentData } from "@/data/mockExperimentData";
import { fallbackOptions, featureLabels, modeOptions, painOptions, receiptOptions, shortLabel, wasteOptions, wtpOptions } from "@/data/survey";
import { isBounce, isSeeded, ctaTable, distribution, featureAverages, framingTable, kpis, painRanking, pct, planTable, referrals, toCSV } from "@/lib/insights";
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
  const deleteFn = useServerFn(adminDeleteSessions);
  const [pass, setPass] = useState("");
  const [rows, setRows] = useState<ExperimentSession[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const unlock = async (code: string, silent = false) => {
    setBusy(true);
    try {
      const res = await fetchInsights({ data: { passcode: code } });
      if (res.ok) {
        sessionStorage.setItem(KEY, code); setError(false);
        // A founder who opened the app by accident leaves an empty session behind: clean it up.
        const mine = useExp.getState().session;
        let list = res.rows;
        if (mine && !mine.survey_pre_completed && tasksDone(mine) === 0) {
          await deleteFn({ data: { passcode: code, ids: [mine.session_id] } }).catch(() => {});
          useExp.getState().reset();
          list = list.filter((r) => r.session_id !== mine.session_id);
        }
        setRows(list);
      }
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
          <input id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" className="mt-4 min-h-11 w-full rounded-[4px] bg-sheet-2 px-3" />
          {error && <p role="alert" className="mt-2 text-[13.5px] text-tomato">That passcode is not right.</p>}
          <Button type="submit" className="mt-4 w-full" disabled={busy || !pass}>{busy ? "Checking" : "Unlock"}</Button>
        </form>
      </div>
    );
  }
  return <Dashboard live={rows} setLive={setRows} passcode={sessionStorage.getItem(KEY) ?? pass} />;
}

const EDITS = "sobra_mock_edits", DELETED = "sobra_mock_deleted_ids";
const readJSON = <T,>(k: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return fallback; } };

function Dashboard({ live, setLive, passcode }: { live: ExperimentSession[]; setLive: (r: ExperimentSession[]) => void; passcode: string }) {
  const saveFn = useServerFn(adminSaveSession);
  const deleteFn = useServerFn(adminDeleteSessions);
  const [mode, setMode] = useState<"live" | "combined">("combined");
  const [view, setView] = useState<"overview" | "explorer">("overview");
  const [excludeBounces, setExcludeBounces] = useState(true);
  const [ghost, setGhost] = useState(false);
  const [mockEdits, setMockEdits] = useState<Record<string, ExperimentSession>>({});
  const [mockDeleted, setMockDeleted] = useState<string[]>([]);
  useEffect(() => {
    setGhost(localStorage.getItem(GHOST_KEY) === "1");
    setMockEdits(readJSON(EDITS, {})); setMockDeleted(readJSON(DELETED, []));
  }, []);
  const toggleGhost = (v: boolean) => { setGhost(v); if (v) localStorage.setItem(GHOST_KEY, "1"); else localStorage.removeItem(GHOST_KEY); toast(v ? "Ghost mode on. Your visits on this device are not recorded." : "Ghost mode off."); };
  const seeded = useMemo(() => getMockExperimentData().filter((r) => !mockDeleted.includes(r.session_id)).map((r) => mockEdits[r.session_id] ?? r), [mockEdits, mockDeleted]);
  const all = useMemo(() => (mode === "live" ? live : [...live, ...seeded]), [mode, live, seeded]);
  const rows = useMemo(() => (excludeBounces ? all.filter((r) => !isBounce(r)) : all), [all, excludeBounces]);

  const saveSession = async (s: ExperimentSession) => {
    if (isSeeded(s)) {
      const next = { ...mockEdits, [s.session_id]: s }; setMockEdits(next); localStorage.setItem(EDITS, JSON.stringify(next));
    } else {
      await saveFn({ data: { passcode, session: s } });
      setLive(live.some((r) => r.session_id === s.session_id) ? live.map((r) => (r.session_id === s.session_id ? s : r)) : [s, ...live]);
    }
  };
  const deleteSessions = async (ids: string[]) => {
    const seededIds = ids.filter((id) => id.startsWith("00000000-0000-4000-8000-"));
    const liveIds = ids.filter((id) => !seededIds.includes(id));
    if (liveIds.length) await deleteFn({ data: { passcode, ids: liveIds } });
    if (seededIds.length) { const next = [...new Set([...mockDeleted, ...seededIds])]; setMockDeleted(next); localStorage.setItem(DELETED, JSON.stringify(next)); }
    setLive(live.filter((r) => !liveIds.includes(r.session_id)));
  };
  const restoreSeeded = () => { setMockEdits({}); setMockDeleted([]); localStorage.removeItem(EDITS); localStorage.removeItem(DELETED); toast("Sample responses restored."); };
  const explorer = <SessionExplorer rows={all} excludeBounces={excludeBounces} setExcludeBounces={setExcludeBounces} onSave={saveSession} onDelete={deleteSessions} onRestoreSeeded={mode === "combined" && (mockDeleted.length > 0 || Object.keys(mockEdits).length > 0) ? restoreSeeded : undefined} />;
  const k = kpis(rows);
  const plan = planTable(rows); const frame = framingTable(rows); const cta = ctaTable(rows);
  const pains = painRanking(rows, painOptions);
  const fallback = distribution(rows, "q2_fallback_nights", fallbackOptions);
  const modeWin = distribution(rows, "q6_mode_winner", modeOptions);
  const rec = distribution(rows, "q7_receipt_habit", receiptOptions);
  const wtp = distribution(rows, "q14_stated_wtp", wtpOptions);
  const waste = distribution(rows, "q11_wasted_items", wasteOptions);
  const feats = featureAverages(rows);
  const refs = referrals(rows);
  const heavy = fallback.filter((f) => ["3 nights", "4 nights", "5+ nights"].includes(f.label)).reduce((a, f) => a + f.count, 0);
  const heavyPct = pct(heavy, fallback.reduce((a, f) => a + f.count, 0));
  const [A, B] = plan; const [F1, F2] = frame; const [C1, C2, C3] = cta;
  const ctaBest = [...cta].sort((a, b) => b.conversion - a.conversion)[0]!;
  const paidWtp = wtp.filter((w) => w.label.startsWith("Up to")).reduce((a, w) => a + w.pct, 0);
  const topFeat = [...feats].sort((a, b) => b.avg - a.avg)[0]!;
  const ctaName = { C1_free_receipt_cashback: "Free + €2 cashback", C2_paid_199_student: "€1.99/mo Student Pro", C3_paid_399_household: "€3.99/mo Household Pro" } as const;

  const download = () => {
    const blob = new Blob([toCSV(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sobra-15q-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const resetMine = () => {
    useExp.getState().reset();
    localStorage.removeItem("sobra-experiment-v2");
    localStorage.removeItem("sobra-v1");
    toast("Your test session is cleared. Open the app to take the survey again.");
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Católica Lisbon NVC · Team V6 Ventures · private</p>
          <h1 className="mt-1 text-[30px] font-bold md:text-[34px]">Founder insights</h1>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <label className="inline-flex items-center gap-2.5 rounded-[3px] bg-ink px-4 py-2 text-[13.5px] font-semibold text-sheet">
            <Ghost className="size-4" aria-hidden />Founder Ghost Mode (Do not record my visits)
            <Switch checked={ghost} onCheckedChange={toggleGhost} className="data-[state=checked]:bg-tape data-[state=unchecked]:bg-sheet/30" />
          </label>
          <UnderlineTabs label="Data mode" value={mode} onChange={setMode} options={[
            { value: "live", label: "Live Supabase Only" },
            { value: "combined", label: `Combined (${seeded.length} Pre-Seeded + Live)` },
          ]} />
        </div>
      </header>

      <UnderlineTabs label="View" value={view} onChange={setView} options={[
        { value: "overview", label: "Overview & Charts" },
        { value: "explorer", label: `Session Explorer & Editor (${all.length})` },
      ]} />

      {view === "explorer" ? explorer : <>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total sessions" value={`${k.n}`} />
        <Kpi label="Stage 1 completion" value={`${k.stage1}%`} />
        <Kpi label="Stage 2 bonus completion" value={`${k.stage2}%`} />
        <Kpi label="Sean Ellis PMF score" value={`${k.pmf}%`} sub="very disappointed · 40% = PMF" />
        <Kpi label="Overall CTA conversion" value={`${k.ctaConversion}%`} />
        <Kpi label="Avg tasks completed" value={`${k.avgTasks}/5`} />
      </section>

      <Section title="Willingness to pay: 3-way split" sub="Each visitor saw one of three offers at the end of Stage 1, split 33/33/33.">
        <Table title="Business model A/B/C" head={["", "C1: Free + €2 Cashback", "C2: €1.99/mo Student Pass (1st Mo Free)", "C3: €3.99/mo Household Pass (1st Mo Free)"]} highlight={cta.indexOf(ctaBest) + 1} rows={[
          ["Visitors (n)", `${C1!.n}`, `${C2!.n}`, `${C3!.n}`],
          ["CTA conversion rate", `${C1!.conversion}%`, `${C2!.conversion}%`, `${C3!.conversion}%`],
          ["Email / WhatsApp left", `${C1!.contact}%`, `${C2!.contact}%`, `${C3!.contact}%`],
          ["Stage 2 bonus completion", `${C1!.bonus}%`, `${C2!.bonus}%`, `${C3!.bonus}%`],
        ]} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Table title="Product mode A/B" head={["", "Variant A (Weekly Prep)", "Variant B (Daily Pick)"]} rows={[
            ["Visitors (n)", `${A!.n}`, `${B!.n}`],
            ["Plan acceptance", `${A!.acceptance}%`, `${B!.acceptance}%`],
            ["Mode switch rate", `${A!.switched}%`, `${B!.switched}%`],
            ["CTA conversion", `${A!.conversion}%`, `${B!.conversion}%`],
          ]} />
          <Table title="Headline framing A/B" head={["", "Frame 1 (Money Saver)", "Frame 2 (Time & Mental Load)"]} rows={[
            ["Visitors (n)", `${F1!.n}`, `${F2!.n}`],
            ["Plan acceptance", `${F1!.acceptance}%`, `${F2!.acceptance}%`],
            ["CTA conversion", `${F1!.conversion}%`, `${F2!.conversion}%`],
            ["PMF score", `${F1!.pmf}%`, `${F2!.pmf}%`],
          ]} />
        </div>
      </Section>

      <Section title="Stage 1 core answers (Q1–Q8)" sub="Everyone who finished the 8 core questions.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="text-[17px] font-bold">Speedboat pain ranking (Q3)</h3>
            <ul className="mt-3 space-y-3">
              {pains.map((p) => {
                const max = Math.max(1, ...pains.map((x) => x.first + x.second));
                return (
                  <li key={p.label}>
                    <div className="flex justify-between gap-3 text-[13.5px]"><span>{shortLabel(p.label)}</span><span className="num shrink-0"><b className="text-tomato">#1: {p.first}</b> · <b className="text-mustard-ink">#2: {p.second}</b></span></div>
                    <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-sheet-2">
                      <div className="bg-tomato" style={{ width: `${(p.first / max) * 100}%` }} /><div className="bg-mustard" style={{ width: `${(p.second / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <Bars title="Fallback nights last week (Q2)" items={fallback} tone="mustard" />
          <Bars title="Mode winner (Q6)" items={modeWin.map((m) => ({ ...m, label: shortLabel(m.label) }))} tone="basil" />
          <Bars title="Fridge tracking friction (Q7)" items={rec} tone="mustard" />
        </div>
      </Section>

      <Section title="Stage 2 deep dive (Q9–Q15)" sub="Only people who unlocked the bonus questions.">
        <div className="grid gap-4 md:grid-cols-2">
          <Bars title="Stated willingness to pay (Q14)" items={wtp.map((w) => ({ ...w, label: shortLabel(w.label) }))} tone="basil" />
          <Bars title="Buy-a-feature, average of 100 points (Q13)" items={feats.map((f) => ({ label: featureLabels[f.key], count: f.avg, pct: f.avg }))} tone="basil" unit="pts" />
          <Bars title="Pack-size waste, last 14 days (Q11)" items={waste} tone="tomato" />
          <div className="card p-5">
            <h3 className="text-[17px] font-bold">Teammate referral leaderboard</h3>
            <table className="num mt-3 w-full text-[13.5px]">
              <thead><tr className="border-b border-rule text-left text-muted-foreground"><th className="py-2 font-medium">?ref=</th><th className="py-2 font-medium">Sessions</th><th className="py-2 font-medium">Stage 1 done</th></tr></thead>
              <tbody>{refs.map((r) => <tr key={r.ref} className="border-b border-rule last:border-0"><td className="py-2 font-semibold">{r.ref}</td><td className="py-2">{r.n}</td><td className="py-2">{r.stage1}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Strategyzer test cards and learning cards" sub="Filled in from the numbers above, ready to screenshot into the slides.">
        <div className="grid gap-4 md:grid-cols-2">
          <LearnCard n={1} hypothesis="We believe Lisbon students fall back to emergency food because they have no plan for the week."
            test={`Pre-app survey, n = ${k.preCount}. Metric: share with 3+ fallback nights.`}
            observation={`${heavyPct}% fell back 3+ nights. Top #1 pain: ${shortLabel(pains[0]?.label ?? "")} (${pains[0]?.first ?? 0} first picks).`}
            learning={heavyPct >= 40 ? "The problem is frequent. Lead the pitch with the no-plan pain." : "Fallback nights are rarer than assumed. Interview more students first."} />
          <LearnCard n={2} hypothesis="Students will commit to a paid plan if the first month is free."
            test={`3-way CTA split, ${C1!.n}/${C2!.n}/${C3!.n} visitors. Metric: CTA conversion.`}
            observation={`Free ${C1!.conversion}% · €1.99 ${C2!.conversion}% · €3.99 ${C3!.conversion}%. ${paidWtp}% state they would pay something (Q14).`}
            learning={`${ctaName[ctaBest.variant]} converts best. ${C2!.conversion >= 40 ? "Test a real €1.99 checkout next." : "Start free, funded by brand cashback."}`} />
          <LearnCard n={3} hypothesis="Sobra reaches product-market fit with Lisbon students (40%+ very disappointed)."
            test={`Sean Ellis question (Q8), n = ${rows.filter((r) => r.q8_pmf_score).length}.`}
            observation={`${k.pmf}% would be very disappointed without Sobra.`}
            learning={k.pmf >= 40 ? "Above the 40% bar. Narrow to the very-disappointed segment and scale outreach." : "Below the 40% bar. Talk to the very-disappointed users to find what they love."} />
          <LearnCard n={4} hypothesis="Weekly synergy prep is the feature students value most."
            test="Buy-a-feature game (Q13) plus mode winner (Q6)."
            observation={`${featureLabels[topFeat.key]} gets ${topFeat.avg} of 100 points on average. Top mode: ${shortLabel(modeWin.slice().sort((a, b) => b.count - a.count)[0]?.label ?? "")}.`}
            learning={`Put ${featureLabels[topFeat.key]} first in onboarding and the pitch.`} />
        </div>
      </Section>

      {explorer}
      </>}

      <div className="card flex flex-wrap gap-2 p-4">
        <Button onClick={download}><Download className="size-4" aria-hidden />Download Full 15-Question CSV for R / Python</Button>
        <Button variant="secondary" onClick={resetMine}><RotateCcw className="size-4" aria-hidden />Reset My Local Test Session</Button>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="card p-4">
      <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <p className="num mt-1 text-[28px] font-bold leading-none">{value}</p>
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
function Bars({ title, items, tone, unit }: { title: string; items: { label: string; count: number; pct: number }[]; tone: keyof typeof toneBg; unit?: string }) {
  return (
    <div className="card p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>
      {items.length === 0 ? <p className="mt-3 text-[14px] text-muted-foreground">No answers yet.</p> : (
        <ul className="mt-3 space-y-3">
          {items.map((it) => (
            <li key={it.label}>
              <div className="flex justify-between gap-3 text-[13.5px]"><span>{it.label}</span><span className="num shrink-0 font-semibold">{unit ? `${it.count} ${unit}` : <>{it.pct}% <span className="font-normal text-muted-foreground">({it.count})</span></>}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-sheet-2"><div className={`h-full rounded-full ${toneBg[tone]}`} style={{ width: `${it.pct}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function Table({ title, head, rows, highlight }: { title: string; head: string[]; rows: string[][]; highlight?: number }) {
  return (
    <div className="card overflow-x-auto p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>
      <table className="num mt-3 w-full text-[13.5px]">
        <thead><tr className="border-b border-rule text-left text-muted-foreground">{head.map((h, i) => <th key={i} className={`py-2 pr-3 font-medium ${i === highlight ? "text-basil" : ""}`}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]} className="border-b border-rule last:border-0">{r.map((c, i) => <td key={i} className={i === 0 ? "py-2 pr-3" : `py-2 pr-3 text-[16px] font-bold ${i === highlight ? "bg-basil-tint text-basil" : ""}`}>{c}</td>)}</tr>)}</tbody>
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
