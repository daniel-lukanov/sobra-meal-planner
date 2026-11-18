import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/pratico/ui";
import { StoreBadge } from "@/components/pratico/Brand";
import { BackLink, PriceNote, Progress } from "@/components/savings/bits";
import { useExp } from "@/lib/experiment";
import { useT, type Key } from "@/lib/i18n";
import { type Line } from "@/lib/savings/engine";
import { asStore, photoReadable } from "@/lib/savings/sample";
import { useSavings } from "@/lib/savings/store";
import { useResult } from "@/lib/savings/use-result";

export const Route = createFileRoute("/check")({ component: Check });

function Check() {
  const { t, m } = useT();
  const navigate = useNavigate();
  const hydrated = useSavings((s) => s.hydrated);
  const { path, lines, store, receiptMeta, failed } = useSavings();
  const [reading, setReading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const edited = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { res } = useResult();

  useEffect(() => { if (hydrated && (!path || path === "manual")) void navigate({ to: "/", replace: true }); }, [hydrated, path, navigate]);
  useEffect(() => { setReading(true); const id = setTimeout(() => setReading(false), 1600); return () => clearTimeout(id); }, [failed]);

  const setLines = (l: Line[]) => useSavings.getState().set({ lines: l });
  const retake = (f: File | undefined) => {
    if (!f) return;
    useExp.getState().track("receipt_photo_taken");
    const ok = photoReadable(f);
    if (!ok) useExp.getState().track("receipt_parse_failed");
    useSavings.getState().set({ failed: !ok });
    setReading(true); setTimeout(() => setReading(false), 1600);
  };
  const chooseDemo = () => { useExp.getState().update({ demo_receipt_used: true }); useSavings.getState().set({ failed: false }); };
  const confirm = () => {
    if (!res) return;
    useExp.getState().track("receipt_confirmed");
    void navigate({ to: "/result" });
  };
  const fileInput = <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { retake(e.target.files?.[0]); e.target.value = ""; }} />;

  if (!path || path === "manual") return null;
  if (reading) {
    return (
      <div><Progress step={2} />
        <div role="status" className="relative mx-auto mt-10 h-64 w-52 overflow-hidden rounded-sheet bg-paper shadow-float">
          <div aria-hidden className="absolute inset-x-0 h-1 bg-basil/70" style={{ animation: "scan-line 1.4s ease-in-out infinite alternate" }} />
        </div>
        <p className="mt-5 text-center font-semibold">{t("read.reading")}</p>
        <style>{"@keyframes scan-line{from{top:0}to{top:calc(100% - 4px)}}"}</style>
      </div>
    );
  }
  if (failed) {
    return (
      <div><Progress step={2} />
        <p role="alert" className="font-semibold text-tomato">{t("read.fail")}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button className="w-full" onClick={() => fileRef.current?.click()}>{t("read.pick_photo")}</Button>
          <Button variant="quiet" className="self-center" onClick={chooseDemo}>{t("start.demo")}</Button>
        </div>
        {fileInput}
      </div>
    );
  }
  const total = Math.round(lines.reduce((s, l) => s + l.price, 0) * 100) / 100;
  const label = (l: Line) => l.name || (l.productId ? t(`p.${l.productId}` as Key) : l.raw);
  return (
    <div>
      <Progress step={2} />
      <h1 className="font-serif text-[26px] font-medium">{t("read.title")}</h1>
      <div className="mt-4 rounded-sheet bg-paper p-4 font-mono text-[13.5px] shadow-float">
        <div className="flex items-center justify-between"><StoreBadge name={asStore(store)} />
          <span className="text-right text-[12px] text-muted-foreground">{receiptMeta?.place}<br />{receiptMeta?.date} {receiptMeta?.time}</span></div>
        <ul className="mt-3 divide-y divide-dashed divide-rule">
          {lines.map((l) => editing === l.id ? (
            <li key={l.id} className="space-y-2 py-2">
              <label className="block text-[12px]">{t("read.name")}<input defaultValue={label(l)} id={`n-${l.id}`} className="mt-1 min-h-10 w-full rounded-ctl bg-sheet-2 px-2" /></label>
              <label className="block text-[12px]">{t("read.price")}<input defaultValue={l.price.toFixed(2)} id={`pr-${l.id}`} inputMode="decimal" className="mt-1 min-h-10 w-full rounded-ctl bg-sheet-2 px-2" /></label>
              <Button variant="secondary" className="min-h-10" onClick={() => {
                const name = (document.getElementById(`n-${l.id}`) as HTMLInputElement).value.trim();
                const price = Number((document.getElementById(`pr-${l.id}`) as HTMLInputElement).value.replace(",", "."));
                if (Number.isFinite(price) && price >= 0 && price < 10000) setLines(lines.map((x) => x.id === l.id ? { ...x, name: name === label(l) ? x.name : name, price: Math.round(price * 100) / 100 } : x));
                if (!edited.current) { edited.current = true; useExp.getState().track("receipt_lines_edited"); }
                setEditing(null);
              }}>{t("read.save_line")}</Button>
            </li>
          ) : (
            <li key={l.id}><button type="button" onClick={() => setEditing(l.id)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
              <span>{label(l)}</span><span>{m(l.price)}</span></button></li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-ink pt-2 font-bold"><span>{t("read.total")}</span><span>{m(total)}</span></div>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">{t("read.fix")} {t("read.sample_note")}</p>
      <div className="mt-5 flex flex-col gap-2">
        <Button className="w-full" onClick={confirm}>{t("read.yes")}</Button>
        <Button variant="quiet" className="self-center" onClick={() => fileRef.current?.click()}>{t("read.again")}</Button>
      </div>
      {fileInput}
      <div className="mt-2"><BackLink to="/" label={t("common.back")} /></div>
      <PriceNote />
    </div>
  );
}
