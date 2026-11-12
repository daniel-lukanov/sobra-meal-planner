import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Ghost, Lock, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addSpend, adminDeleteSessions, adminSaveSession, deleteSpend, getInsights, type SpendRow } from "@/lib/experiment.functions";
import type { ExperimentSession } from "@/lib/experiment-types";
import { GHOST_KEY, useExp } from "@/lib/experiment";
import { Switch } from "@/components/ui/switch";
import { SessionExplorer } from "@/components/sobra/SessionExplorer";
import {
  dealBrandOptions, fallbackOptions, keepOneOptions, modeOptions, painOptions, pmfOptions, prepBlockerOptions, receiptBlockerOptions, receiptOptions, stopperOptions, workaroundOptions,
} from "@/data/survey";
import { activation, behaviour, costPerTester, ctaTable, distribution, funnel, groupBy, isBounce, pct, planTable, plansPerWeek, referralEntries, toCSV } from "@/lib/insights";
import { Button, UnderlineTabs } from "@/components/sobra/ui";
import { SobraLogo } from "@/components/sobra/Brand";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Founder insights · pratico" },
      { name: "description", content: "Private customer discovery and A/B test results for the pratico team." },
      { property: "og:title", content: "Founder insights · pratico" },
      { property: "og:description", content: "Private customer discovery and A/B test results for the pratico team." },
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
  const [data, setData] = useState<{ rows: ExperimentSession[]; spend: SpendRow[] } | null>(null);
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
        if (mine && isBounce(mine)) {
          await deleteFn({ data: { passcode: code, ids: [mine.session_id] } }).catch(() => {});
          useExp.getState().reset();
          list = list.filter((r) => r.session_id !== mine.session_id);
        }
        setData({ rows: list, spend: res.spend });
      } else { sessionStorage.removeItem(KEY); if (!silent) setError(true); }
    } catch { if (!silent) toast("Could not load responses. Try again in a moment."); }
    finally { setBusy(false); }
  };
  useEffect(() => { const saved = sessionStorage.getItem(KEY); if (saved) void unlock(saved, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return (
      <div className="mx-auto mt-10 max-w-[420px]">
        <form className="card p-6" onSubmit={(e) => { e.preventDefault(); if (!pass) { setError(true); return; } void unlock(pass); }}>
          <SobraLogo />
          <h1 className="mt-6 flex items-center gap-2 text-[24px] font-bold"><Lock className="size-5 text-muted-foreground" aria-hidden />Founder insights</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Enter the team passcode to see the study results.</p>
          <label htmlFor="pass" className="sr-only">Passcode</label>
          <input id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" className="mt-4 min-h-11 w-full rounded-[8px] bg-sheet-2 px-3" />
          {error && <p role="alert" className="mt-2 text-[13.5px] text-tomato">{pass ? "That passcode is not right." : "Enter the passcode to continue"}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={busy}>{busy ? "Checking" : "Unlock"}</Button>
        </form>
      </div>
    );
  }
  return <Dashboard live={data.rows} spend={data.spend} setLive={(rows) => setData({ ...data, rows })} setSpend={(spend) => setData({ ...data, spend })} passcode={sessionStorage.getItem(KEY) ?? pass} />;
}

type View = "overview" | "questions" | "why" | "explorer";

function Dashboard({ live, spend, setLive, setSpend, passcode }: { live: ExperimentSession[]; spend: SpendRow[]; setLive: (r: ExperimentSession[]) => void; setSpend: (s: SpendRow[]) => void; passcode: string }) {
  const saveFn = useServerFn(adminSaveSession);
  const deleteFn = useServerFn(adminDeleteSessions);
  const [view, setView] = useState<View>("overview");
  const [excludeBounces, setExcludeBounces] = useState(true);
  const [ghost, setGhost] = useState(false);
  useEffect(() => { setGhost(localStorage.getItem(GHOST_KEY) === "1"); }, []);
  const toggleGhost = (v: boolean) => { setGhost(v); if (v) localStorage.setItem(GHOST_KEY, "1"); else localStorage.removeItem(GHOST_KEY); toast(v ? "Ghost mode on. Your visits on this device are not recorded." : "Ghost mode off."); };
  const rows = useMemo(() => (excludeBounces ? live.filter((r) => !isBounce(r)) : live), [live, excludeBounces]);

  const saveSession = async (s: ExperimentSession) => {
    await saveFn({ data: { passcode, session: s } });
    setLive(live.some((r) => r.session_id === s.session_id) ? live.map((r) => (r.session_id === s.session_id ? s : r)) : [s, ...live]);
  };
  const deleteSessions = async (ids: string[]) => { await deleteFn({ data: { passcode, ids } }); setLive(live.filter((r) => !ids.includes(r.session_id))); };
  const download = () => {
    const blob = new Blob([toCSV(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pratico-study-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const resetMine = () => {
    useExp.getState().reset();
    localStorage.removeItem("pratico-study-v3"); localStorage.removeItem("pratico-app-v2"); sessionStorage.removeItem("pratico-visit");
    toast("Your test session is cleared. Open the app to start again.");
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Católica Lisbon NVC · Team V6 Ventures · private</p>
          <h1 className="mt-1 text-[30px] font-bold md:text-[34px]">Founder insights</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{rows.length} sessions{excludeBounces ? ", bounces left out" : ""}.</p>
        </div>
        <label className="inline-flex items-center gap-2.5 rounded-[6px] bg-ink px-4 py-2 text-[13.5px] font-semibold text-sheet">
          <Ghost className="size-4" aria-hidden />Founder Ghost Mode (do not record my visits)
          <Switch checked={ghost} onCheckedChange={toggleGhost} className="data-[state=checked]:bg-tape data-[state=unchecked]:bg-sheet/30" />
        </label>
      </header>

      <UnderlineTabs label="View" value={view} onChange={setView} options={[
        { value: "overview", label: "Funnel and metrics" },
        { value: "questions", label: "Answers" },
        { value: "why", label: "Why we ask" },
        { value: "explorer", label: `Sessions (${live.length})` },
      ]} />

      {view === "overview" && <Overview rows={rows} spend={spend} setSpend={setSpend} passcode={passcode} />}
      {view === "questions" && <Questions rows={rows} />}
      {view === "why" && <WhyWeAsk />}
      {view === "explorer" && <SessionExplorer rows={live} excludeBounces={excludeBounces} setExcludeBounces={setExcludeBounces} onSave={saveSession} onDelete={deleteSessions} />}

      <div className="card flex flex-wrap gap-2 p-4">
        <Button onClick={download}><Download className="size-4" aria-hidden />Download CSV</Button>
        <Button variant="secondary" onClick={resetMine}><RotateCcw className="size-4" aria-hidden />Reset my local test session</Button>
      </div>
    </div>
  );
}

function FunnelTable({ title, groups }: { title: string; groups: [string, ExperimentSession[]][] }) {
  const head = ["", ...funnel([]).map((f) => f.label)];
  return <Table title={title} head={head} rows={groups.map(([k, g]) => [k, ...funnel(g).map((f) => `${f.count}`)])} />;
}

function Overview({ rows, spend, setSpend, passcode }: { rows: ExperimentSession[]; spend: SpendRow[]; setSpend: (s: SpendRow[]) => void; passcode: string }) {
  const f = funnel(rows);
  const weeks = plansPerWeek(rows);
  const cost = costPerTester(rows, spend);
  const act = activation(rows);
  const [A, B] = planTable(rows);
  const cta = ctaTable(rows);
  const bh = behaviour(rows);
  const refs = referralEntries(rows);
  const modeA = distribution(A!.rows, "b2_mode_pref", modeOptions).items, modeB = distribution(B!.rows, "b2_mode_pref", modeOptions).items;
  return (
    <div className="space-y-10">
      <Section title="Funnel" sub="Each step counts sessions that reached it.">
        <div className="card p-5">
          <ul className="space-y-3">
            {f.map((s) => (
              <li key={s.label}>
                <div className="flex justify-between gap-3 text-[13.5px]"><span>{s.label}</span><span className="num font-semibold">{s.count} <span className="font-normal text-muted-foreground">({s.pct}%)</span></span></div>
                <div className="mt-1 h-2 bg-sheet-2"><div className="h-full bg-basil" style={{ width: `${s.pct}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 space-y-4">
          <FunnelTable title="By channel (utm_source)" groups={groupBy(rows, (r) => r.utm_source)} />
          <FunnelTable title="By post text (utm_content)" groups={groupBy(rows, (r) => r.utm_content ?? "none")} />
        </div>
      </Section>

      <Section title="Our three metrics" sub="North star, cost per acquired tester and activation.">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-5">
            <h3 className="text-[17px] font-bold">North star: plans accepted per week</h3>
            {weeks.length === 0 ? <p className="mt-3 text-[14px] text-muted-foreground">No accepted plans yet.</p> : (
              <ul className="num mt-3 space-y-1 text-[14px]">{weeks.map((w) => <li key={w.week} className="flex justify-between"><span>{w.week}</span><b>{w.count}</b></li>)}</ul>
            )}
          </div>
          <div className="card p-5">
            <h3 className="text-[17px] font-bold">Cost per acquired tester</h3>
            <p className="num mt-2 text-[28px] font-bold leading-none">{cost.cpa === null ? "–" : `€${cost.cpa.toFixed(2)}`}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">€{cost.total.toFixed(2)} spent, {cost.acquired} finished Block 1.</p>
            <table className="num mt-3 w-full text-[13px]">
              <thead><tr className="text-left text-muted-foreground"><th className="py-1 font-medium">Channel</th><th className="font-medium">Spend</th><th className="font-medium">Testers</th><th className="font-medium">Per tester</th></tr></thead>
              <tbody>{cost.byChannel.map((c) => <tr key={c.channel} className="border-t border-rule"><td className="py-1">{c.channel}</td><td>€{c.spend.toFixed(2)}</td><td>{c.acquired}</td><td>{c.cpa === null ? "–" : `€${c.cpa.toFixed(2)}`}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="card p-5">
            <h3 className="text-[17px] font-bold">Activation</h3>
            <p className="num mt-2 text-[28px] font-bold leading-none">{act.voluntary}%</p>
            <p className="mt-1 text-[13px] text-muted-foreground">tapped Accept this week on their own in their first session.</p>
            <p className="num mt-3 text-[14px]">Including taps during the tour: <b>{act.withTour}%</b></p>
          </div>
        </div>
        <SpendLog spend={spend} setSpend={setSpend} passcode={passcode} />
      </Section>

      <Section title="A/B tests" sub="Plan tab opened first, and the offer on the end screen.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Table title="ab_plan_variant" head={["", "A: Weekly prep first", "B: Daily pick first"]} rows={[
            ["Sessions", `${A!.n}`, `${B!.n}`],
            ["Accept rate", `${A!.accept}%`, `${B!.accept}%`],
            ...modeOptions.map((m, i) => [`Q4: ${m.split(" (")[0]}`, `${modeA[i]!.pct}%`, `${modeB[i]!.pct}%`]),
          ]} />
          <Table title="ab_cta_variant (people who finished Block 3)" head={["", "Free pilot", "€1.99 a month"]} rows={[
            ["Saw the offer", `${cta[0]!.n}`, `${cta[1]!.n}`],
            ["CTA click rate", `${cta[0]!.click}%`, `${cta[1]!.click}%`],
            ["Left contact", `${cta[0]!.contact}%`, `${cta[1]!.contact}%`],
          ]} />
        </div>
      </Section>

      <Section title="Behaviour" sub="What people did, not what they said.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Receipt scans on their own" value={`${bh.voluntaryScans}`} sub={`${bh.guidedScans} during the tour`} />
          <Kpi label="Deals added to plan" value={`${bh.dealsAdded}`} />
          <Kpi label="Swaps per session" value={`${bh.swapsPerSession}`} />
          <Kpi label="Fake door taps" value={`${bh.tiktok + bh.delivery}`} sub={`TikTok import ${bh.tiktok}, delivery ${bh.delivery}`} />
          <Kpi label="WhatsApp shares" value={`${bh.shares}`} sub={`vs ${bh.copies} copies`} />
          <Kpi label="Instagram follow taps" value={`${bh.igFollows}`} />
          <Kpi label="Tour skipped" value={`${bh.tourSkipped}`} />
          <Kpi label="Referral sign-ups" value={`${f.at(-1)!.count}`} />
        </div>
        {refs.length > 0 && (
          <Table title="Extra raffle entries from referrals" head={["Sharer code", "Sign-ups", "Sharer email"]} rows={refs.map((r) => [r.ref, `${r.entries}`, r.sharer?.raffle_email ?? r.sharer?.cta_contact ?? "–"])} />
        )}
      </Section>
    </div>
  );
}

function SpendLog({ spend, setSpend, passcode }: { spend: SpendRow[]; setSpend: (s: SpendRow[]) => void; passcode: string }) {
  const add = useServerFn(addSpend), del = useServerFn(deleteSpend);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState("");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    const a = Number(amount.replace(",", "."));
    if (!channel.trim()) { setErr("Add the channel, for example instagram"); document.getElementById("sp-ch")?.focus(); return; }
    if (!amount || !Number.isFinite(a) || a < 0) { setErr("Add the amount in euros"); document.getElementById("sp-am")?.focus(); return; }
    setErr(null);
    try { const r = await add({ data: { passcode, spent_on: date, channel, amount: a } }); setSpend([r, ...spend]); setChannel(""); setAmount(""); }
    catch { toast("That did not save. Try again."); }
  };
  return (
    <div className="card mt-4 p-5">
      <h3 className="text-[17px] font-bold">Spend log</h3>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-[12.5px] font-semibold text-muted-foreground">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block min-h-10 bg-sheet-2 px-3 text-[14px] text-ink" /></label>
        <label className="text-[12.5px] font-semibold text-muted-foreground">Channel<input id="sp-ch" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="instagram" className="mt-1 block min-h-10 bg-sheet-2 px-3 text-[14px] text-ink" /></label>
        <label className="text-[12.5px] font-semibold text-muted-foreground">Amount (€)<input id="sp-am" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block min-h-10 w-28 bg-sheet-2 px-3 text-[14px] text-ink" /></label>
        <Button className="min-h-10" onClick={() => void submit()}>Add spend</Button>
      </div>
      {err && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-tomato">{err}</p>}
      {spend.length > 0 && (
        <ul className="num mt-3 divide-y divide-rule text-[13.5px]">
          {spend.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-1.5">
              <span>{s.spent_on} · {s.channel}</span>
              <span className="flex items-center gap-2">€{s.amount.toFixed(2)}
                <button type="button" aria-label="Delete spend" onClick={async () => { await del({ data: { passcode, id: s.id } }); setSpend(spend.filter((x) => x.id !== s.id)); }} className="flex size-8 items-center justify-center text-tomato"><Trash2 className="size-4" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Questions({ rows }: { rows: ExperimentSession[] }) {
  const charts: [string, keyof ExperimentSession, readonly string[]][] = [
    ["Q1 Fallback dinners last week", "b1_fallback_dinners", fallbackOptions],
    ["Q2 Biggest pains (up to 2)", "b1_pains", painOptions],
    ["Q3 Current workarounds", "b1_workarounds", workaroundOptions],
    ["Q4 Mode they'd use next week", "b2_mode_pref", modeOptions],
    ["Q4b What puts them off weekly prep", "b2_prep_blockers", prepBlockerOptions],
    ["Q5 Would snap the receipt", "b3_receipt", receiptOptions],
    ["Q5b Why not scan", "b3_receipt_blockers", receiptBlockerOptions],
    ["Q6 Keep only one thing", "b3_keep_one", keepOneOptions],
    ["Q7 Buy the brand on deal", "b3_deal_brand", dealBrandOptions],
    ["Q8 If pratico didn't launch", "b3_pmf", pmfOptions],
    ["Q9 What would stop them", "b3_stoppers", stopperOptions],
  ];
  const pmfBySource = groupBy(rows.filter((r) => r.b3_pmf), (r) => r.utm_source);
  const texts = rows.flatMap((r) => [r.b2_mode_reason && `Q4 why: ${r.b2_mode_reason}`, r.b3_stoppers_other && `Q9 other: ${r.b3_stoppers_other}`].filter(Boolean) as string[]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {charts.map(([t, k, o]) => { const d = distribution(rows, k, o); return <Bars key={k} title={`${t} (n = ${d.answered})`} items={d.items} />; })}
      </div>
      <Table title="Q8 very disappointed, by channel" head={["utm_source", "Answered", "Very disappointed"]}
        rows={pmfBySource.map(([k, g]) => [k, `${g.length}`, `${pct(g.filter((r) => r.b3_pmf === pmfOptions[0]).length, g.length)}%`])} />
      <div className="card p-5">
        <h3 className="text-[17px] font-bold">Written answers</h3>
        {texts.length === 0 ? <p className="mt-2 text-[14px] text-muted-foreground">None yet.</p> : <ul className="mt-2 space-y-1 text-[14px]">{texts.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      </div>
    </div>
  );
}

const why: [string, string, string][] = [
  ["Q1 fallback dinners", "the dinner problem is frequent", "if under 40% say 3 or more, lead with money instead of daily decisions"],
  ["Q2 pains", "which pain matters most", "sets our main message; many \"None\" = weak problem"],
  ["Q3 workarounds", "people already patch the problem", "identifies early adopters; \"batch cook\" supports weekly prep"],
  ["Q4 mode + Q4b blockers", "people will prep ahead", "under 30% Weekly prep or Both = weekly prep becomes secondary; blockers say what to fix"],
  ["Q5 receipt + Q5b blockers", "people will scan receipts / need a fridge view", "input problem = replace scan with ticking; no need = drop the fridge"],
  ["Q6 keep one", "which feature carries the value", "roadmap order"],
  ["Q7 deal brand", "deals change what people buy", "supports brand/supermarket-funded revenue"],
  ["Q8 pmf", "product/market fit signal", "40% very disappointed = strong"],
  ["Q9 stoppers", "what blocks repeat use", "top answer becomes the next iteration"],
];
function WhyWeAsk() {
  return <Table title="Why we ask (internal, never shown to testers)" head={["Question", "What it tests", "Decision rule"]} rows={why.map((r) => [...r])} plain />;
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
  return <section><h2 className="text-[22px] font-bold">{title}</h2><p className="mb-4 text-[14px] text-muted-foreground">{sub}</p>{children}</section>;
}
function Bars({ title, items }: { title: string; items: { label: string; count: number; pct: number }[] }) {
  return (
    <div className="card p-5">
      <h3 className="text-[16px] font-bold">{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((it) => (
          <li key={it.label}>
            <div className="flex justify-between gap-3 text-[13.5px]"><span>{it.label}</span><span className="num shrink-0 font-semibold">{it.pct}% <span className="font-normal text-muted-foreground">({it.count})</span></span></div>
            <div className="mt-1 h-2 bg-sheet-2"><div className="h-full bg-basil" style={{ width: `${it.pct}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
function Table({ title, head, rows, plain }: { title: string; head: string[]; rows: string[][]; plain?: boolean }) {
  return (
    <div className="card overflow-x-auto p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>
      <table className="num mt-3 w-full text-[13.5px]">
        <thead><tr className="border-b border-rule text-left text-muted-foreground">{head.map((h, i) => <th key={i} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={head.length} className="py-3 text-muted-foreground">No data yet.</td></tr>}
          {rows.map((r, j) => <tr key={j} className="border-b border-rule last:border-0">{r.map((c, i) => <td key={i} className={i === 0 || plain ? "py-2 pr-3" : "py-2 pr-3 font-semibold"}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
