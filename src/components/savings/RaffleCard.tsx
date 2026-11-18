import { useState } from "react";
import { Button } from "@/components/pratico/ui";
import { useExp } from "@/lib/experiment";
import { isEmail } from "@/lib/experiment-types";
import { useT } from "@/lib/i18n";

const IG = "https://www.instagram.com/pratico.lisboa/";

export function RaffleCard() {
  const { t } = useT();
  const contact = useExp((s) => s.session?.cta_contact);
  const [email, setEmail] = useState(isEmail(contact) ? contact! : "");
  const [state, setState] = useState<"idle" | "bad" | "done">("idle");
  const save = () => {
    if (!isEmail(email)) { setState("bad"); document.getElementById("raffle-email")?.focus(); return; }
    useExp.getState().update({ raffle_email: email.trim() }, true);
    setState("done");
  };
  const follow = () => { useExp.getState().track("ig_follow_clicked"); window.open(IG, "_blank", "noopener"); };
  return (
    <section className="rounded-sheet bg-sheet p-5">
      <h2 className="text-[19px] font-bold">{t("fin.raffle.title")}</h2>
      <p className="mt-1 text-[14.5px]">{t("fin.raffle.text")}</p>
      <label htmlFor="raffle-email" className="mt-3 block text-[13.5px] font-medium">{t("fin.raffle.email")}</label>
      <input id="raffle-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} maxLength={120} className="mt-1 min-h-11 w-full rounded-ctl bg-sheet-2 px-3" />
      {state === "bad" && <p role="alert" className="mt-1 text-[13.5px] font-semibold text-tomato">{t("fin.raffle.bad")}</p>}
      <p className="mt-1 text-[12.5px] text-muted-foreground">{t("common.privacy")}</p>
      <div className="mt-3 flex flex-col gap-2">
        <Button variant="secondary" onClick={save}>{t("fin.raffle.save")}</Button>
        <Button variant="secondary" onClick={follow}>{t("fin.follow")}</Button>
      </div>
      {state === "done" && <p role="status" className="mt-2 font-semibold">{t("fin.raffle.thanks")}</p>}
      <p className="mt-3 text-[13.5px] text-muted-foreground">{t("fin.raffle.friends")}</p>
    </section>
  );
}
