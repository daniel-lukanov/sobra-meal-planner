import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ctaVariants, framingVariants, newSession, planVariants, taskKeys, tasksDone, type ExperimentSession } from "@/lib/experiment-types";
import { isBounce, isSeeded, statusOf, type SessionStatus } from "@/lib/insights";
import {
  fallbackOptions, featureKeys, featureLabels, householdOptions, modeOptions, painOptions, pmfOptions, receiptOptions, shortLabel,
  storeOptions, switchOptions, synergyOptions, timingOptions, wasteOptions, workaroundOptions, wtpOptions, type FeatureKey,
} from "@/data/survey";
import { Button, UnderlineTabs } from "./ui";
import { cn } from "@/lib/utils";

type R = ExperimentSession;
type Props = {
  rows: R[]; excludeBounces: boolean; setExcludeBounces: (v: boolean) => void;
  onSave: (s: R) => Promise<void>; onDelete: (ids: string[]) => Promise<void>; onRestoreSeeded?: (() => void) | undefined;
};
const filters = ["All Sessions", "Stage 1 Completed", "Stage 2 Bonus Completed", "In-App Tasks Only", "Empty Bounces (0 actions)"] as const;
type Filter = (typeof filters)[number];
const match: Record<Filter, (r: R) => boolean> = {
  "All Sessions": () => true,
  "Stage 1 Completed": (r) => r.survey_post_completed,
  "Stage 2 Bonus Completed": (r) => r.bonus_completed,
  "In-App Tasks Only": (r) => tasksDone(r) > 0 && !r.survey_post_completed,
  "Empty Bounces (0 actions)": isBounce,
};
const statusTone: Record<SessionStatus, string> = {
  "Stage 2 Done": "bg-basil text-basil-ink", "Stage 1 Done": "bg-basil-tint text-basil",
  "Tour In Progress": "bg-mustard-tint text-[var(--mustard-ink)]", "Empty Bounce": "bg-tomato-tint text-tomato",
};
const short = { A_weekly_prep: "A", B_daily_pick: "B", F1_money_saver: "F1", F2_time_mental_load: "F2", C1_free_receipt_cashback: "C1", C2_paid_199_student: "C2", C3_paid_399_household: "C3" } as const;

export function SessionExplorer({ rows, excludeBounces, setExcludeBounces, onSave, onDelete, onRestoreSeeded }: Props) {
  const [filter, setFilter] = useState<Filter>("All Sessions");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const bounces = rows.filter(isBounce);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(match[filter]).filter((r) => !t || [r.session_id, r.referral_source, r.q5_primary_store, r.contact].some((v) => v?.toLowerCase().includes(t)));
  }, [rows, filter, q]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); } catch { toast("That did not save. Check the passcode and try again."); }
    finally { setBusy(false); }
  };
  const del = (ids: string[], label: string) => {
    if (!ids.length || !window.confirm(`Delete ${label}? This cannot be undone for live sessions.`)) return;
    void run(async () => { await onDelete(ids); setSel((s) => s.filter((x) => !ids.includes(x))); }, `${ids.length} ${ids.length === 1 ? "session" : "sessions"} deleted.`);
  };
  const allShownSelected = shown.length > 0 && shown.every((r) => sel.includes(r.session_id));

  return (
    <section aria-labelledby="se" className="space-y-4">
      <div>
        <h2 id="se" className="text-[22px] font-bold">Session explorer and data manager</h2>
        <p className="text-[14px] text-muted-foreground">Inspect, edit or delete any session. Every chart and number above recalculates straight away.</p>
      </div>
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter sessions">
          {filters.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              className={cn("press min-h-9 rounded-[3px] border px-3.5 text-[13px] font-semibold", filter === f ? "border-basil bg-basil text-basil-ink" : "border-rule bg-sheet hover:bg-sheet-2")}>
              {f} <span className="num opacity-75">{rows.filter(match[f]).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Search sessions</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, ?ref=, store or contact" className="min-h-10 w-full rounded-[4px] bg-sheet-2 pl-9 pr-3 text-[14px]" />
          </label>
          <label className="inline-flex items-center gap-2 text-[13.5px] font-medium">
            <Switch checked={excludeBounces} onCheckedChange={setExcludeBounces} className="data-[state=checked]:bg-basil data-[state=unchecked]:bg-rule" />
            Exclude empty bounce sessions from all KPIs & charts
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !bounces.length} onClick={() => del(bounces.map((r) => r.session_id), `all ${bounces.length} empty bounce sessions`)}
            className="press inline-flex min-h-10 items-center gap-2 rounded-[4px] bg-tomato-tint px-4 text-[13.5px] font-semibold text-tomato disabled:opacity-50">
            <Trash2 className="size-4" aria-hidden />Purge All Empty Bounce Sessions ({bounces.length})
          </button>
          <Button variant="secondary" disabled={busy || !sel.length} onClick={() => del(sel, `${sel.length} selected sessions`)} className="min-h-10 text-[13.5px]">
            <Trash2 className="size-4" aria-hidden />Delete Selected ({sel.length})
          </Button>
          <Button onClick={() => setEdit({ ...newSession("manual_interview"), survey_pre_completed: true })} className="min-h-10 text-[13.5px]">
            <Plus className="size-4" aria-hidden />Add Manual Session
          </Button>
          {onRestoreSeeded && <Button variant="quiet" onClick={onRestoreSeeded} className="min-h-10 text-[13.5px]">Restore sample responses</Button>}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="num w-full min-w-[1080px] text-[13px]">
          <thead>
            <tr className="border-b border-rule text-left text-muted-foreground">
              <th className="p-3"><input type="checkbox" aria-label="Select all shown" checked={allShownSelected}
                onChange={(e) => setSel(e.target.checked ? [...new Set([...sel, ...shown.map((r) => r.session_id)])] : sel.filter((id) => !shown.some((r) => r.session_id === id)))} /></th>
              {["Session", "Source", "Status", "Variants", "Store & spend", "Tasks", "Time", "CTA converted", ""].map((h, i) => <th key={i} className="p-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No sessions match.</td></tr>}
            {shown.map((r) => {
              const st = statusOf(r); const n = tasksDone(r);
              return (
                <tr key={r.session_id} onClick={() => setEdit(r)} className="cursor-pointer border-b border-rule last:border-0 hover:bg-sheet-2">
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${r.session_id.slice(0, 8)}`} checked={sel.includes(r.session_id)}
                      onChange={(e) => setSel(e.target.checked ? [...sel, r.session_id] : sel.filter((x) => x !== r.session_id))} />
                  </td>
                  <td className="p-3"><span className="font-mono font-semibold">{r.session_id.slice(0, 8)}</span><span className="block text-[12px] text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span></td>
                  <td className="p-3"><span className={cn("rounded-[3px] px-2 py-0.5 text-[11.5px] font-semibold", isSeeded(r) ? "bg-sheet-2 text-muted-foreground" : "bg-basil-tint text-basil")}>{isSeeded(r) ? "Seeded" : "Live"}</span><span className="block pt-1 text-[12px]">?ref={r.referral_source}</span></td>
                  <td className="p-3"><span className={cn("whitespace-nowrap rounded-[3px] px-2.5 py-1 text-[12px] font-semibold", statusTone[st])}>{st}</span></td>
                  <td className="p-3 whitespace-nowrap">{short[r.ab_plan_variant]} · {short[r.ab_framing_variant]} · {short[r.ab_cta_variant]}</td>
                  <td className="p-3">{r.q5_primary_store ?? "–"}<span className="block text-[12px] text-muted-foreground">{r.q5_weekly_spend != null ? `€${r.q5_weekly_spend}/wk` : "no spend"}</span></td>
                  <td className="p-3"><span className="flex items-center gap-1" aria-label={`${n} of 5 tasks`}>{taskKeys.map((k) => <span key={k} className={cn("size-2.5 rounded-full", r[k] ? "bg-basil" : "bg-rule")} />)}<span className="ml-1">{n}/5</span></span></td>
                  <td className="p-3">{r.time_spent_seconds}s</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <button type="button" disabled={busy} onClick={() => void run(() => onSave({ ...r, cta_converted: !r.cta_converted }), "CTA updated.")}
                      className={cn("press min-h-8 rounded-[3px] px-3 text-[12px] font-semibold", r.cta_converted ? "bg-basil text-basil-ink" : "bg-sheet-2 text-muted-foreground")}>
                      {r.cta_converted ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEdit(r)} className="inline-flex min-h-8 items-center gap-1 rounded-[4px] px-2 font-semibold text-basil hover:bg-basil-tint"><Pencil className="size-3.5" aria-hidden />Inspect / Edit</button>
                      <button type="button" aria-label="Delete session" onClick={() => del([r.session_id], "this session")} className="flex size-8 items-center justify-center rounded-[4px] text-tomato hover:bg-tomato-tint"><Trash2 className="size-4" aria-hidden /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edit && <SessionEditor key={edit.session_id} initial={edit} isNew={!rows.some((r) => r.session_id === edit.session_id)} onClose={() => setEdit(null)}
        onSave={(s) => run(async () => { await onSave(s); setEdit(null); }, "Saved. Insights recalculated.")}
        onDelete={() => { const id = edit.session_id; if (!window.confirm("Delete this session?")) return; void run(async () => { await onDelete([id]); setEdit(null); }, "Session deleted."); }} busy={busy} />}
    </section>
  );
}

const tabs = [
  { value: "behavior", label: "Behavior & variants" },
  { value: "pre", label: "Stage 1A (Q1–Q5)" },
  { value: "post", label: "Stage 1B (Q6–Q8)" },
  { value: "bonus", label: "Stage 2 (Q9–Q15)" },
] as const;
type Tab = (typeof tabs)[number]["value"];

function SessionEditor({ initial, isNew, onClose, onSave, onDelete, busy }: { initial: R; isNew: boolean; onClose: () => void; onSave: (s: R) => void; onDelete: () => void; busy: boolean }) {
  const [s, setS] = useState<R>(initial);
  const [tab, setTab] = useState<Tab>("behavior");
  const up = (p: Partial<R>) => setS((c) => ({ ...c, ...p }));
  const pts = s.q13_buy_a_feature ?? (Object.fromEntries(featureKeys.map((k) => [k, 0])) as Record<FeatureKey, number>);
  const ptsTotal = featureKeys.reduce((a, k) => a + (pts[k] ?? 0), 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sheet border-[1.5px] border-ink bg-sheet p-6 sm:p-8">
        <DialogTitle className=" text-[24px] font-bold">{isNew ? "Add manual session" : "Session inspector & editor"}</DialogTitle>
        <DialogDescription className="font-mono text-[12.5px]">{s.session_id} · {isSeeded(s) ? "seeded sample (edits saved on this device)" : "live"}</DialogDescription>
        <UnderlineTabs label="Editor section" value={tab} onChange={setTab} options={tabs.map((t) => ({ ...t }))} />

        {tab === "behavior" && (
          <div className="space-y-5">
            <p className="rounded-[4px] bg-sheet-2 p-3 text-[13.5px]">
              {tasksDone(s)} of 5 tasks done, {s.time_spent_seconds}s in the app.
              {s.accepted_week_clicked ? " Accepted the week." : ""}{s.swapped_meal_clicked ? " Swapped a meal." : ""}{s.fridge_receipt_scanned ? " Scanned a receipt." : ""}{s.cook_tab_visited ? " Opened Cook." : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Referral source (?ref=)"><input className={inputCls} value={s.referral_source} maxLength={60} onChange={(e) => up({ referral_source: e.target.value })} /></Field>
              <Field label="Time spent (seconds)"><input type="number" min={0} className={inputCls} value={s.time_spent_seconds} onChange={(e) => up({ time_spent_seconds: Math.max(0, Math.round(+e.target.value || 0)) })} /></Field>
              <Field label="Plan variant"><Sel value={s.ab_plan_variant} options={planVariants} onChange={(v) => up({ ab_plan_variant: v as R["ab_plan_variant"] })} /></Field>
              <Field label="Framing variant"><Sel value={s.ab_framing_variant} options={framingVariants} onChange={(v) => up({ ab_framing_variant: v as R["ab_framing_variant"] })} /></Field>
              <Field label="CTA variant"><Sel value={s.ab_cta_variant} options={ctaVariants} onChange={(v) => up({ ab_cta_variant: v as R["ab_cta_variant"] })} /></Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {([...taskKeys, "accepted_week_clicked", "swapped_meal_clicked", "fridge_receipt_scanned", "cook_tab_visited"] as const).map((k) => (
                <Toggle key={k} label={k} checked={s[k]} onChange={(v) => up({ [k]: v })} />
              ))}
            </div>
          </div>
        )}
        {tab === "pre" && (
          <div className="space-y-4">
            <Toggle label="survey_pre_completed" checked={s.survey_pre_completed} onChange={(v) => up({ survey_pre_completed: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Q1 Household"><Sel value={s.q1_household} options={householdOptions} onChange={(v) => up({ q1_household: v })} /></Field>
              <Field label="Q2 Fallback nights"><Sel value={s.q2_fallback_nights} options={fallbackOptions} onChange={(v) => up({ q2_fallback_nights: v })} /></Field>
              <Field label="Q3 Speedboat pain #1"><Sel value={s.q3_pain_1} options={painOptions} onChange={(v) => up({ q3_pain_1: v })} /></Field>
              <Field label="Q3 Speedboat pain #2"><Sel value={s.q3_pain_2} options={painOptions} onChange={(v) => up({ q3_pain_2: v })} /></Field>
              <Field label="Q4 Current workaround"><Sel value={s.q4_workaround} options={workaroundOptions} onChange={(v) => up({ q4_workaround: v })} /></Field>
              <Field label="Q5a Primary store"><Sel value={s.q5_primary_store} options={storeOptions} onChange={(v) => up({ q5_primary_store: v })} /></Field>
              <Field label="Q5b Weekly spend (€)"><input type="number" min={0} max={1000} className={inputCls} value={s.q5_weekly_spend ?? ""} onChange={(e) => up({ q5_weekly_spend: e.target.value === "" ? null : Math.min(1000, Math.max(0, Math.round(+e.target.value))) })} /></Field>
            </div>
          </div>
        )}
        {tab === "post" && (
          <div className="space-y-4">
            <Toggle label="survey_post_completed" checked={s.survey_post_completed} onChange={(v) => up({ survey_post_completed: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Q6 Mode winner"><Sel value={s.q6_mode_winner} options={modeOptions} onChange={(v) => up({ q6_mode_winner: v })} /></Field>
              <Field label="Q7 Fridge tracking habit"><Sel value={s.q7_receipt_habit} options={receiptOptions} onChange={(v) => up({ q7_receipt_habit: v })} /></Field>
              <Field label="Q8 Sean Ellis PMF"><Sel value={s.q8_pmf_score} options={pmfOptions} onChange={(v) => up({ q8_pmf_score: v })} /></Field>
              <Field label="Contact (email / WhatsApp)"><input className={inputCls} maxLength={200} value={s.contact ?? ""} onChange={(e) => up({ contact: e.target.value || null, contact_left: !!e.target.value })} /></Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="cta_converted" checked={!!s.cta_converted} onChange={(v) => up({ cta_converted: v })} />
              <Toggle label="shared_on_whatsapp" checked={s.shared_on_whatsapp} onChange={(v) => up({ shared_on_whatsapp: v })} />
            </div>
          </div>
        )}
        {tab === "bonus" && (
          <div className="space-y-4">
            <Toggle label="bonus_completed" checked={s.bonus_completed} onChange={(v) => up({ bonus_completed: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Q9 Dinner decision timing"><Sel value={s.q9_last_dinner_timing} options={timingOptions} onChange={(v) => up({ q9_last_dinner_timing: v })} /></Field>
              <Field label="Q10 Store switching threshold"><Sel value={s.q10_switch_threshold} options={switchOptions} onChange={(v) => up({ q10_switch_threshold: v })} /></Field>
              <Field label="Q12 Sunday potato synergy"><Sel value={s.q12_synergy_attitude} options={synergyOptions} onChange={(v) => up({ q12_synergy_attitude: v })} /></Field>
              <Field label="Q14 Stated willingness to pay"><Sel value={s.q14_stated_wtp} options={wtpOptions} onChange={(v) => up({ q14_stated_wtp: v })} /></Field>
            </div>
            <Field label="Q11 Wasted food">
              <div className="flex flex-wrap gap-2">
                {wasteOptions.map((w) => {
                  const on = s.q11_wasted_items?.includes(w) ?? false;
                  return <button key={w} type="button" aria-pressed={on} onClick={() => { const cur = s.q11_wasted_items ?? []; const next = on ? cur.filter((x) => x !== w) : [...cur, w]; up({ q11_wasted_items: next.length ? next : null }); }}
                    className={cn("press min-h-9 rounded-[3px] border px-3 text-[13px] font-medium", on ? "border-basil bg-basil text-basil-ink" : "border-rule bg-sheet")}>{w}</button>;
                })}
              </div>
            </Field>
            <Field label={`Q13 Buy-a-feature (${ptsTotal} of 100 points)`}>
              <div className="grid gap-2 sm:grid-cols-5">
                {featureKeys.map((k) => (
                  <label key={k} className="text-[12px]">{featureLabels[k]}
                    <input type="number" min={0} max={100} step={5} className={inputCls} value={pts[k] ?? 0} onChange={(e) => up({ q13_buy_a_feature: { ...pts, [k]: Math.min(100, Math.max(0, Math.round(+e.target.value || 0))) } })} />
                  </label>
                ))}
              </div>
              {ptsTotal !== 100 && <p className="mt-1 text-[12.5px] text-tomato">Points add up to {ptsTotal}, not 100.</p>}
            </Field>
            <Field label="Q15 Open feedback"><textarea className={cn(inputCls, "min-h-24 py-2")} maxLength={2000} value={s.q15_open_feedback ?? ""} onChange={(e) => up({ q15_open_feedback: e.target.value || null })} /></Field>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
          {!isNew ? <button type="button" disabled={busy} onClick={onDelete} className="press inline-flex min-h-10 items-center gap-2 rounded-[4px] bg-tomato-tint px-4 text-[14px] font-semibold text-tomato"><Trash2 className="size-4" aria-hidden />Delete Session</button> : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <button type="button" disabled={busy} onClick={() => onSave(s)} className="press rounded-[4px] bg-basil px-6 py-2.5 font-semibold text-basil-ink disabled:opacity-60">{busy ? "Saving" : "Save Changes & Recalculate Insights"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = "mt-1 min-h-10 w-full rounded-[4px] bg-sheet px-3 text-[14px]";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><p className="text-[12.5px] font-semibold text-muted-foreground">{label}</p>{children}</div>;
}
function Sel({ value, options, onChange }: { value: string | null; options: readonly string[]; onChange: (v: string | null) => void }) {
  return (
    <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No answer</option>
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      {options.map((o) => <option key={o} value={o}>{shortLabel(o)}</option>)}
    </select>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-[4px] bg-sheet-2 px-3 text-[13.5px] font-medium">
      <span className="font-mono text-[12.5px]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-basil data-[state=unchecked]:bg-rule" />
    </label>
  );
}
