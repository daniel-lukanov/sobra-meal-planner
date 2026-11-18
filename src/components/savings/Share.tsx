import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/pratico/ui";
import { useExp } from "@/lib/experiment";
import { useT } from "@/lib/i18n";
import type { Result } from "@/lib/savings/engine";
import { createShared, isDesktop, shareLink, shareText, whatsappUrl } from "@/lib/savings/share";

/** Creates the share snapshot ahead of the tap, so WhatsApp opens straight from the click. */
export function useShare(res: Result | null, manual: boolean) {
  const { lang, t } = useT();
  const [id, setId] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const key = res ? `${res.userStore}|${res.saving}|${res.cheapestStore}` : "";
  const made = useRef("");
  useEffect(() => {
    const s = useExp.getState().session;
    if (!res || !s || made.current === key) return;
    made.current = key;
    void createShared(s.session_id, res).then((v) => { setId(v); if (v) useExp.getState().update({ shared_result_id: v }); });
  }, [key, res]);
  const text = () => {
    if (!res) return "";
    const s = useExp.getState().session;
    return shareText(lang, res, manual, id ? shareLink(window.location.origin, id, s?.my_ref ?? "") : null);
  };
  const whatsapp = () => { useExp.getState().track("whatsapp_share_clicked"); window.open(whatsappUrl(text(), isDesktop()), "_blank", "noopener"); };
  const copy = async () => {
    const tx = text();
    useExp.getState().track("result_copied");
    try { await navigator.clipboard.writeText(tx); setCopied(true); setFallback(null); setTimeout(() => setCopied(false), 2500); }
    catch { setFallback(tx); }
  };
  return { whatsapp, copy, copied, fallback, label: (k: "copy") => t(k === "copy" ? (copied ? "common.copied" : "common.copy") : "common.copy") };
}

export function ShareRow({ res, manual, primary }: { res: Result | null; manual: boolean; primary: boolean }) {
  const { t } = useT();
  const sh = useShare(res, manual);
  return (
    <div>
      <div className="flex gap-2">
        <Button variant={primary ? "primary" : "secondary"} className={primary ? "flex-1 font-bold" : "flex-1"} onClick={sh.whatsapp}>{primary ? t("fin.whatsapp") : t("res.share")}</Button>
        <Button variant="secondary" onClick={() => void sh.copy()}>{sh.label("copy")}</Button>
      </div>
      {sh.fallback && (
        <div className="mt-2"><p className="text-[13px] text-muted-foreground">{t("share.fallback")}</p>
          <textarea readOnly value={sh.fallback} rows={4} onFocus={(e) => e.currentTarget.select()} className="mt-1 w-full rounded-ctl bg-sheet-2 p-2 text-[13.5px]" /></div>
      )}
    </div>
  );
}
