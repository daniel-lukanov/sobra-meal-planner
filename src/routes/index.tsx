import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/pratico/ui";
import { Progress, jumpTo } from "@/components/savings/bits";
import { Photo } from "@/components/savings/Photo";
import { QuestionBlock, answered } from "@/components/savings/QuestionBlock";
import { useExp } from "@/lib/experiment";
import { useT } from "@/lib/i18n";
import { useSavings, type Path } from "@/lib/savings/store";
import { photoReadable, sampleLines, sampleMeta } from "@/lib/savings/sample";

const OG = "https://pratico-lisboa.lovable.app/images/savings/share.jpg";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "pratico: see what you overpaid on your last shop" },
      { name: "description", content: "Check your last supermarket receipt and see how much you could have saved in Lisbon this week. Free, about one minute, no account." },
      { property: "og:title", content: "pratico: see what you overpaid on your last shop" },
      { property: "og:description", content: "Check your last supermarket receipt and see how much you could have saved in Lisbon this week." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG },
    ],
  }),
  component: Start,
});

const REQUIRED = ["q1", "q2", "q3"] as const;

function Start() {
  const { t } = useT();
  const navigate = useNavigate();
  const session = useExp((s) => s.session);
  const fileRef = useRef<HTMLInputElement>(null);
  const [missing, setMissing] = useState<string[]>([]);

  /** Returns true when the three required questions are answered; otherwise shows messages and jumps to the first gap. */
  const ready = () => {
    const miss = REQUIRED.filter((q) => !answered(session as never, q));
    setMissing(miss);
    if (miss.length) { jumpTo(`q-${miss[0]}`); return false; }
    useExp.getState().update({ survey_pre_completed: true, survey_version: "v3_savings" });
    return true;
  };
  const go = (path: Path, to: "/check" | "/manual") => {
    useExp.getState().update({ path, ...(path !== "manual" ? { demo_receipt_used: true } : {}) });
    useExp.getState().track("path_chosen");
    useSavings.getState().set({ path, failed: false, ...(path !== "manual" ? { lines: sampleLines(), receiptMeta: sampleMeta, store: "Pingo Doce" } : {}) });
    void navigate({ to });
  };
  const onScan = () => { if (ready()) fileRef.current?.click(); };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    useExp.getState().track("receipt_photo_taken");
    const okFile = photoReadable(f);
    if (!okFile) useExp.getState().track("receipt_parse_failed");
    go("receipt", "/check");
    useSavings.getState().set({ failed: !okFile });
  };
  const err = (id: string) => (missing.includes(id) ? t("start.missing_one") : undefined);

  return (
    <div>
      <Progress step={1} />
      <Photo src="/images/savings/start.jpg" className="mb-5 h-36 sm:h-44" />
      <h1 className="font-serif text-[30px] font-medium leading-tight">{t("start.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("start.sub")}</p>
      <div className="mt-6 space-y-5">
        <QuestionBlock id="q1" error={err("q1")} />
        <QuestionBlock id="q2" error={err("q2")} />
        <QuestionBlock id="q3" error={err("q3")} />
      </div>
      {missing.length > 0 && <p role="alert" className="mt-4 text-[13.5px] font-semibold text-tomato">{t("start.missing")}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Button className="w-full" onClick={onScan}>{t("start.scan")}</Button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <Button variant="secondary" className="w-full" onClick={() => { if (ready()) go("manual", "/manual"); }}>{t("start.manual")}</Button>
        <Button variant="quiet" className="self-center" onClick={() => { if (ready()) go("demo", "/check"); }}>{t("start.demo")}</Button>
      </div>
      <p className="mt-3 text-center text-[13px] text-muted-foreground">{t("start.fine")}</p>
    </div>
  );
}
