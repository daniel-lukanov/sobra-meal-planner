import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ctaVariants, newSession, planVariants, type ExperimentSession } from "@/lib/experiment-types";
import { sessionSchema } from "@/lib/experiment.functions";
import { isBounce, statusOf, type SessionStatus } from "@/lib/insights";
import { dealBrandOptions, fallbackOptions, keepOneOptions, modeOptions, pmfOptions, receiptOptions, storeOptions } from "@/data/survey";
import { Button } from "./ui";
import { cn } from "@/lib/utils";

type R = ExperimentSession;
type Props = { rows: R[]; excludeBounces: boolean; setExcludeBounces: (v: boolean) => void; onSave: (s: R) => Promise<void>; onDelete: (ids: string[]) => Promise<void> };
const filters = ["All", "Block 1 done", "Block 3 done", "Bounces"] as const;
type Filter = (typeof filters)[number];
const match: Record<Filter, (r: R) => boolean> = {
  All: () => true, "Block 1 done": (r) => r.survey_pre_completed, "Block 3 done": (r) => r.survey_post_completed, Bounces: isBounce,
};
const statusTone: Record<SessionStatus, string> = {
  "Block 3 done": "bg-basil text-basil-ink", "Block 1 done": "bg-basil-tint text-basil", Started: "bg-mustard-tint text-[var(--mustard-ink)]", Bounce: "bg-tomato-tint text-tomato",
};

export function SessionExplorer({ rows, excludeBounces, setExcludeBounces, onSave, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const bounces = rows.filter(isBounce);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(match[filter]).filter((r) => !t || [r.session_id, r.utm_source, r.utm_content, r.ref, r.store, r.cta_contact, r.raffle_email].some((v) => v?.toLowerCase().includes(t)));
  }, [rows, filter, q]);
  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); } catch { toast("That did not save. Check the passcode and try again."); } finally { setBusy(false); }
  };
  const del = (ids: string[], label: string) => {
    if (!ids.length || !window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    void run(async () => { await onDelete(ids); setSel((s) => s.filter((x) => !ids.includes(x))); }, `${ids.length} ${ids.length === 1 ? "session" : "sessions"} deleted.`);
  };

  return (
    <section aria-labelledby="se" className="space-y-4">
      <h2 id="se" className="text-[22px] font-bold">Session explorer</h2>
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter sessions">
          {filters.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              className={cn("press min-h-9 rounded-[6px] border px-3.5 text-[13px] font-semibold", filter === f ? "border-basil bg-basil text-basil-ink" : "border-rule bg-sheet hover:bg-sheet-2")}>
              {f} <span className="num opacity-75">{rows.filter(match[f]).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Search sessions</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, channel, ref, store or contact" className="min-h-10 w-full rounded-[8px] bg-sheet-2 pl-9 pr-3 text-[14px]" />
          </label>
          <label className="inline-flex items-center gap-2 text-[13.5px] font-medium">
            <Switch checked={excludeBounces} onCheckedChange={setExcludeBounces} className="data-[state=checked]:bg-basil data-[state=unchecked]:bg-rule" />
            Leave bounces out of all numbers
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !bounces.length} onClick={() => del(bounces.map((r) => r.session_id), `all ${bounces.length} bounce sessions`)}
            className="press inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-tomato-tint px-4 text-[13.5px] font-semibold text-tomato disabled:opacity-50">
            <Trash2 className="size-4" aria-hidden />Delete all bounces ({bounces.length})
          </button>
          <Button variant="secondary" disabled={busy || !sel.length} onClick={() => del(sel, `${sel.length} selected sessions`)} className="min-h-10 text-[13.5px]"><Trash2 className="size-4" aria-hidden />Delete selected ({sel.length})</Button>
          <Button onClick={() => setEdit({ ...newSession("?utm_source=manual_interview"), survey_pre_completed: true })} className="min-h-10 text-[13.5px]"><Plus className="size-4" aria-hidden />Add manual session</Button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="num w-full min-w-[960px] text-[13px]">
          <thead><tr className="border-b border-rule text-left text-muted-foreground">
            <th className="p-3"><input type="checkbox" aria-label="Select all shown" checked={shown.length > 0 && shown.every((r) => sel.includes(r.session_id))}
              onChange={(e) => setSel(e.target.checked ? [...new Set([...sel, ...shown.map((r) => r.session_id)])] : sel.filter((id) => !shown.some((r) => r.session_id === id)))} /></th>
            {["Session", "Channel", "Status", "Variants", "Store", "Accepted", "Time", "CTA", ""].map((h, i) => <th key={i} className="p-3 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No sessions yet.</td></tr>}
            {shown.map((r) => {
              const st = statusOf(r);
              return (
                <tr key={r.session_id} onClick={() => setEdit(r)} className="cursor-pointer border-b border-rule last:border-0 hover:bg-sheet-2">
                  <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.session_id.slice(0, 8)}`} checked={sel.includes(r.session_id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.session_id] : sel.filter((x) => x !== r.session_id))} /></td>
                  <td className="p-3"><span className="font-mono font-semibold">{r.session_id.slice(0, 8)}</span><span className="block text-[12px] text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span></td>
                  <td className="p-3">{r.utm_source}<span className="block text-[12px] text-muted-foreground">{r.utm_content ?? ""}{r.ref ? ` ref=${r.ref}` : ""}</span></td>
                  <td className="p-3"><span className={cn("whitespace-nowrap rounded-[6px] px-2.5 py-1 text-[12px] font-semibold", statusTone[st])}>{st}</span></td>
                  <td className="p-3 whitespace-nowrap">{r.ab_plan_variant === "A_weekly_prep" ? "A" : "B"} · {r.ab_cta_variant}</td>
                  <td className="p-3">{r.store ?? "–"}</td>
                  <td className="p-3">{r.accepted_week_clicked ? "Yes" : "No"}</td>
                  <td className="p-3">{r.time_spent_seconds}s</td>
                  <td className="p-3">{r.cta_clicked ? "Clicked" : "–"}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEdit(r)} className="inline-flex min-h-8 items-center gap-1 px-2 font-semibold text-basil"><Pencil className="size-3.5" aria-hidden />Edit</button>
                      <button type="button" aria-label="Delete session" onClick={() => del([r.session_id], "this session")} className="flex size-8 items-center justify-center text-tomato"><Trash2 className="size-4" aria-hidden /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edit && <SessionEditor key={edit.session_id} initial={edit} isNew={!rows.some((r) => r.session_id === edit.session_id)} onClose={() => setEdit(null)} busy={busy}
        onSave={(s) => run(async () => { await onSave(s); setEdit(null); }, "Saved. Insights recalculated.")}
        onDelete={() => { const id = edit.session_id; if (!window.confirm("Delete this session?")) return; void run(async () => { await onDelete([id]); setEdit(null); }, "Session deleted."); }} />}
    </section>
  );
}

function SessionEditor({ initial, isNew, onClose, onSave, onDelete, busy }: { initial: R; isNew: boolean; onClose: () => void; onSave: (s: R) => void; onDelete: () => void; busy: boolean }) {
  const [s, setS] = useState<R>(initial);
  const [raw, setRaw] = useState<string | null>(null);
  const [rawErr, setRawErr] = useState(false);
  const up = (p: Partial<R>) => setS((c) => ({ ...c, ...p }));
  const save = () => {
    if (raw === null) return onSave(s);
    try { onSave(sessionSchema.parse(JSON.parse(raw)) as R); setRawErr(false); } catch { setRawErr(true); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-sheet bg-sheet p-6 sm:p-8">
        <DialogTitle className="text-[24px] font-bold">{isNew ? "Add manual session" : "Edit session"}</DialogTitle>
        <DialogDescription className="font-mono text-[12.5px]">{s.session_id}</DialogDescription>
        {raw === null ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="utm_source"><input className={inputCls} value={s.utm_source} maxLength={60} onChange={(e) => up({ utm_source: e.target.value })} /></Field>
              <Field label="utm_content"><input className={inputCls} value={s.utm_content ?? ""} maxLength={60} onChange={(e) => up({ utm_content: e.target.value || null })} /></Field>
              <Field label="Plan variant"><Sel value={s.ab_plan_variant} options={planVariants} onChange={(v) => v && up({ ab_plan_variant: v as R["ab_plan_variant"] })} /></Field>
              <Field label="CTA variant"><Sel value={s.ab_cta_variant} options={ctaVariants} onChange={(v) => v && up({ ab_cta_variant: v as R["ab_cta_variant"] })} /></Field>
              <Field label="Store"><Sel value={s.store} options={storeOptions} onChange={(v) => up({ store: v })} /></Field>
              <Field label="Q1 Fallback dinners"><Sel value={s.b1_fallback_dinners} options={fallbackOptions} onChange={(v) => up({ b1_fallback_dinners: v })} /></Field>
              <Field label="Q4 Mode"><Sel value={s.b2_mode_pref} options={modeOptions} onChange={(v) => up({ b2_mode_pref: v })} /></Field>
              <Field label="Q5 Receipt"><Sel value={s.b3_receipt} options={receiptOptions} onChange={(v) => up({ b3_receipt: v })} /></Field>
              <Field label="Q6 Keep one"><Sel value={s.b3_keep_one} options={keepOneOptions} onChange={(v) => up({ b3_keep_one: v })} /></Field>
              <Field label="Q7 Deal brand"><Sel value={s.b3_deal_brand} options={dealBrandOptions} onChange={(v) => up({ b3_deal_brand: v })} /></Field>
              <Field label="Q8 PMF"><Sel value={s.b3_pmf} options={pmfOptions} onChange={(v) => up({ b3_pmf: v })} /></Field>
              <Field label="CTA contact"><input className={inputCls} maxLength={200} value={s.cta_contact ?? ""} onChange={(e) => up({ cta_contact: e.target.value || null })} /></Field>
              <Field label="Raffle email"><input className={inputCls} maxLength={200} value={s.raffle_email ?? ""} onChange={(e) => up({ raffle_email: e.target.value || null })} /></Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["survey_pre_completed", "survey_post_completed", "accepted_week_clicked", "cta_clicked", "ig_follow_clicked", "receipt_scan_tried"] as const).map((k) => (
                <Toggle key={k} label={k} checked={s[k]} onChange={(v) => up({ [k]: v })} />
              ))}
            </div>
            <button type="button" onClick={() => setRaw(JSON.stringify(s, null, 2))} className="text-[13.5px] font-semibold text-basil underline underline-offset-4">Edit every field as JSON</button>
          </div>
        ) : (
          <div>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="h-[50vh] w-full bg-sheet-2 p-3 font-mono text-[12px]" />
            {rawErr && <p role="alert" className="mt-1 text-[13px] font-semibold text-tomato">This JSON doesn't match the session format.</p>}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
          {!isNew ? <button type="button" disabled={busy} onClick={onDelete} className="press inline-flex min-h-10 items-center gap-2 bg-tomato-tint px-4 text-[14px] font-semibold text-tomato"><Trash2 className="size-4" aria-hidden />Delete session</button> : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={busy} onClick={save}>{busy ? "Saving" : "Save changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = "mt-1 min-h-10 w-full rounded-[8px] bg-sheet-2 px-3 text-[14px]";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><p className="text-[12.5px] font-semibold text-muted-foreground">{label}</p>{children}</div>;
}
function Sel({ value, options, onChange }: { value: string | null; options: readonly string[]; onChange: (v: string | null) => void }) {
  return (
    <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No answer</option>
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 bg-sheet-2 px-3 text-[13.5px] font-medium">
      <span className="font-mono text-[12.5px]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-basil data-[state=unchecked]:bg-rule" />
    </label>
  );
}
