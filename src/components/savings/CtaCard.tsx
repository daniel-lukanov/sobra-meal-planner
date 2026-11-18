import { useState } from "react";
import { Button } from "@/components/pratico/ui";
import { useExp } from "@/lib/experiment";
import { isEmail } from "@/lib/experiment-types";
import { PLUS_PRICE, useT } from "@/lib/i18n";

const isPhone = (v: string) => v.replace(/[^\d]/g, "").length >= 8 && /^[+\d\s()-]+$/.test(v.trim());
export const isContact = (v: string) => isEmail(v) || isPhone(v);

/** Join the free pilot, or reserve a paid spot, by ab_cta_variant. */
export function CtaCard() {
  const { t, m } = useT();
  const variant = useExp((s) => s.session?.ab_cta_variant);
  const paid = variant === "paid" || variant === "paid_199";
  const [step, setStep] = useState<"card" | "contact" | "done">("card");
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const click = () => { useExp.getState().track("cta_clicked"); setStep("contact"); };
  const save = () => {
    if (!isContact(val)) { setErr(t("fin.contact.bad")); document.getElementById("cta-contact")?.focus(); return; }
    useExp.getState().update({ cta_contact: val.trim() }, true);
    useExp.getState().track("contact_left");
    setStep("done");
  };
  return (
    <section className="rounded-sheet bg-basil-tint p-5">
      <h2 className="text-[19px] font-bold">{paid ? t("fin.cta.paid_title", { price: m(PLUS_PRICE) }) : t("fin.cta.free_title")}</h2>
      <p className="mt-1 text-[14.5px]">{paid ? t("fin.cta.paid_text") : t("fin.cta.free_text")}</p>
      {step === "card" && <Button className="mt-4 w-full" onClick={click}>{paid ? t("fin.cta.paid_btn") : t("fin.cta.free_btn")}</Button>}
      {step === "contact" && (
        <div className="mt-4">
          <label htmlFor="cta-contact" className="text-[13.5px] font-medium">{t("fin.contact.label")}</label>
          <input id="cta-contact" value={val} onChange={(e) => { setVal(e.target.value); setErr(""); }} maxLength={120} className="mt-1 min-h-11 w-full rounded-ctl bg-sheet px-3" />
          {err && <p role="alert" className="mt-1 text-[13.5px] font-semibold text-tomato">{err}</p>}
          <p className="mt-1 text-[12.5px] text-muted-foreground">{t("common.privacy")}</p>
          <div className="mt-3 flex gap-2"><Button className="flex-1" onClick={save}>{t("fin.contact.send")}</Button><Button variant="quiet" onClick={() => setStep("done")}>{t("common.no_thanks")}</Button></div>
        </div>
      )}
      {step === "done" && val && isContact(val) && <p role="status" className="mt-3 font-semibold">{t("fin.contact.thanks")}</p>}
    </section>
  );
}
