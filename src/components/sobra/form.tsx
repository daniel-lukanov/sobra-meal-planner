import { useState, type ReactNode } from "react";
import { toggleMulti } from "@/data/survey";
import { cn } from "@/lib/utils";

export function Question({ id, title, hint, error, children }: { id: string; title: string; hint?: string; error?: string | undefined; children: ReactNode }) {
  return (
    <fieldset id={`q-${id}`} className="scroll-mt-24 border-t border-rule pt-5" aria-describedby={error ? `e-${id}` : undefined}>
      <legend className="float-left mb-3 w-full text-[15.5px] font-semibold">{title}{hint && <span className="block text-[13px] font-medium text-muted-foreground">{hint}</span>}</legend>
      <div className="clear-both">{children}</div>
      {error && <p id={`e-${id}`} role="alert" className="mt-2 text-[13.5px] font-semibold text-tomato">{error}</p>}
    </fieldset>
  );
}

function Opt({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("press min-h-11 rounded-[6px] px-4 py-2 text-left text-[14.5px] font-medium", on ? "bg-basil text-basil-ink" : "bg-sheet-2 hover:bg-sheet-hover")}>{children}</button>
  );
}

export function Single({ options, value, onChange }: { options: readonly string[]; value: string | null; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map((o) => <Opt key={o} on={value === o} onClick={() => onChange(o)}>{o}</Opt>)}</div>;
}

export function Multi({ options, value, onChange, max, exclusive }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; max?: number; exclusive?: string }) {
  const [limit, setLimit] = useState(false);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Opt key={o} on={value.includes(o)} onClick={() => {
            const r = toggleMulti(value, o, { ...(max !== undefined ? { max } : {}), ...(exclusive ? { exclusive } : {}) });
            setLimit(r.limited);
            if (!r.limited) onChange(r.next);
          }}>{o}</Opt>
        ))}
      </div>
      {limit && <p role="status" className="mt-2 text-[13.5px] font-semibold text-tomato">You can pick {max}. Remove one first.</p>}
    </>
  );
}

export function TextLine({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3">
      <label htmlFor={id} className="text-[13.5px] font-medium text-muted-foreground">{label}</label>
      <input id={id} value={value} maxLength={280} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-11 w-full rounded-ctl bg-sheet-2 px-3 text-[14.5px]" />
    </div>
  );
}

/** Checks required answers; on a miss shows messages, scrolls to the first missing one and focuses it. */
export function useRequired() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const check = (rules: { id: string; ok: boolean; msg?: string }[]) => {
    const e: Record<string, string> = {};
    for (const r of rules) if (!r.ok) e[r.id] = r.msg ?? "Choose at least one option to continue";
    setErrors(e);
    const first = rules.find((r) => !r.ok);
    if (first) {
      const el = document.getElementById(`q-${first.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true });
    }
    return !first;
  };
  const clear = (id: string) => setErrors((e) => { if (!e[id]) return e; const { [id]: _x, ...rest } = e; return rest; });
  return { errors, check, clear };
}
