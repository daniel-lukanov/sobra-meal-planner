import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/pratico/ui";
import { PriceNote } from "@/components/savings/bits";
import { praticoDb } from "@/integrations/pratico-db/client";
import { useExp } from "@/lib/experiment";
import { isEmail } from "@/lib/experiment-types";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/s/$id")({ component: Landing });

type Snap = { store: string; saving: number; cheapest_store: string };

function Landing() {
  const { id } = Route.useParams();
  const { t, m } = useT();
  const [snap, setSnap] = useState<Snap | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "bad" | "done">("idle");
  const hasRef = useExp((s) => !!s.session?.ref);

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) { setSnap(null); return; }
    void praticoDb.rpc("share_result_get", { p_id: id }).then(({ data, error }) => setSnap(error || !data?.[0] ? null : { ...data[0], saving: Number(data[0].saving) }));
  }, [id]);

  if (snap === undefined) return null;
  const signup = () => {
    if (!isEmail(email)) { setState("bad"); return; }
    useExp.getState().update({ referral_email: email.trim(), raffle_email: email.trim() }, true);
    useExp.getState().track("referral_signup");
    setState("done");
  };
  return (
    <div>
      {snap ? (
        <h1 className="font-serif text-[30px] font-medium leading-tight">{t("land.title", { name: t("land.someone"), saving: m(snap.saving), store: snap.store })}</h1>
      ) : (
        <h1 className="font-serif text-[30px] font-medium leading-tight">{t("start.title")}</h1>
      )}
      <p className="mt-2 text-muted-foreground">{t("land.sub")}</p>
      <PriceNote className="mt-1" />
      <Link to="/" className="mt-6 block"><span className="press inline-flex min-h-11 w-full items-center justify-center rounded-ctl bg-basil px-4 text-[15px] font-semibold text-basil-ink">{t("land.btn")}</span></Link>
      {hasRef && state !== "done" && (
        <div className="mt-8 border-t border-rule pt-5">
          <label htmlFor="ref-email" className="text-[14px] font-medium">{t("land.referral")}</label>
          <input id="ref-email" type="email" value={email} maxLength={120} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} placeholder={t("land.email")} className="mt-2 min-h-11 w-full rounded-ctl bg-sheet-2 px-3" />
          {state === "bad" && <p role="alert" className="mt-1 text-[13.5px] font-semibold text-tomato">{t("fin.raffle.bad")}</p>}
          <p className="mt-1 text-[12.5px] text-muted-foreground">{t("common.privacy")}</p>
          <Button variant="secondary" className="mt-2" onClick={signup}>{t("land.signup")}</Button>
        </div>
      )}
      {state === "done" && <p role="status" className="mt-6 font-semibold">{t("fin.raffle.thanks")}</p>}
    </div>
  );
}
