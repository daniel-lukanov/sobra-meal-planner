import { useId, useState } from "react";
import { formatAmount, toBase, unitChoices } from "@/lib/amounts";
import { Button, Chip } from "./ui";

/** How much of a food is in the fridge, how much this week's dinners need, and a way to correct the amount. */
export function FridgeAmount({ qty, unit, need, onChange }: { qty: number | undefined; unit: string; need: number | null; onChange: (qty: number | undefined) => void }) {
  const units = unitChoices(unit);
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [factor, setFactor] = useState(1);
  const [bad, setBad] = useState(false);

  const open = () => {
    const big = qty !== undefined && qty >= 1000 && units.length > 1;
    const f = big ? units[1]!.factor : 1;
    setFactor(f); setValue(qty === undefined ? "" : String(Math.round((qty / f) * 100) / 100)); setBad(false); setEditing(true);
  };
  const save = () => {
    const q = toBase(value, factor);
    if (q === null) { setBad(true); return; }
    onChange(q); setEditing(false);
  };

  if (editing) {
    return (
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={inputId}>Amount</label>
        <input id={inputId} inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setBad(false); }} onKeyDown={(e) => e.key === "Enter" && save()}
          className="num min-h-10 w-24 rounded-ctl bg-sheet-2 px-3" aria-invalid={bad} />
        {units.length > 1 ? (
          <select aria-label="Unit" value={factor} onChange={(e) => setFactor(Number(e.target.value))} className="min-h-10 rounded-ctl bg-sheet-2 px-2">
            {units.map((u) => <option key={u.label} value={u.factor}>{u.label}</option>)}
          </select>
        ) : <span className="text-[14px] text-muted-foreground">{units[0]!.label}</span>}
        <Button onClick={save}>Save</Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
        {qty !== undefined && <button type="button" onClick={() => { onChange(undefined); setEditing(false); }} className="min-h-10 text-[13px] text-muted-foreground underline underline-offset-4">Clear amount</button>}
        {bad && <span role="alert" className="w-full text-[12.5px] font-medium text-tomato">Enter an amount above zero.</span>}
      </div>
    );
  }

  const has = qty ?? 0;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px]">
      {qty === undefined ? (
        <span className="text-muted-foreground">Amount not set. We assume you have enough.</span>
      ) : (
        <span><span className="num font-semibold">{formatAmount(qty, unit)}</span> <span className="text-muted-foreground">in the fridge</span></span>
      )}
      {need !== null && need > 0 && (
        qty === undefined ? <Chip>Needs {formatAmount(need, unit)} this week</Chip>
        : has >= need ? <Chip tone="basil">Enough: needs {formatAmount(need, unit)} this week</Chip>
        : <Chip tone="mustard">Short by {formatAmount(need - has, unit)}: needs {formatAmount(need, unit)}</Chip>
      )}
      <button type="button" onClick={open} className="min-h-9 text-muted-foreground underline underline-offset-4">{qty === undefined ? "Set amount" : "Change"}</button>
    </div>
  );
}
