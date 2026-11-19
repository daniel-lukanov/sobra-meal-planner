import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/pratico/ui";
import { useExp } from "@/lib/experiment";
import { useT } from "@/lib/i18n";
import { useSavings } from "@/lib/savings/store";

/**
 * Invites people to the Block 3 survey after they have seen their number.
 * Opens as a pop-over a few seconds after the result (or once they scroll down), never on top of the number straight away.
 * After "Later" it becomes a bar fixed to the bottom of the screen until the survey is done.
 */
export function SurveyPrompt({ delayMs = 4000 }: { delayMs?: number }) {
  const { t } = useT();
  const navigate = useNavigate();
  const done = useExp((s) => !!s.session?.survey_post_completed);
  const hydrated = useSavings((s) => s.hydrated);
  const dismissed = useSavings((s) => s.promptDismissed);
  const [open, setOpen] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!hydrated || done || dismissed) return;
    let fired = false;
    const show = () => { if (fired) return; fired = true; setOpen(true); useExp.getState().track("survey_prompt_shown"); };
    const id = setTimeout(show, delayMs);
    const onScroll = () => { if (window.scrollY > window.innerHeight * 0.6) show(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(id); window.removeEventListener("scroll", onScroll); };
  }, [hydrated, done, dismissed, delayMs]);
  useEffect(() => {
    if (!open) return;
    startRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") later(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => { useExp.getState().track("survey_prompt_accepted"); setOpen(false); void navigate({ to: "/finish" }); };
  const later = () => { useExp.getState().track("survey_prompt_dismissed"); setOpen(false); useSavings.getState().set({ promptDismissed: true }); };

  if (!hydrated || done) return null;
  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" onClick={later}>
        <div role="dialog" aria-modal="true" aria-labelledby="sp-title" onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-t-[20px] bg-basil p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-basil-ink shadow-float sm:rounded-[20px]"
          style={{ animation: "sp-up 260ms cubic-bezier(.2,.8,.2,1)" }}>
          <button type="button" aria-label={t("sp.later")} onClick={later} className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full hover:bg-basil-ink/10"><X className="size-5" aria-hidden /></button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mustard px-3 py-1 text-[13px] font-bold text-ink"><ClipboardList className="size-4" aria-hidden />{t("sp.tag")}</span>
          <h2 id="sp-title" className="mt-4 font-serif text-[30px] font-medium leading-tight">{t("sp.title")}</h2>
          <p className="mt-2 text-[15.5px] opacity-90">{t("sp.text")}</p>
          <button ref={startRef} type="button" onClick={start}
            className="press mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-ctl bg-sheet px-4 text-[16px] font-bold text-ink hover:bg-ground">{t("sp.start")}</button>
          <button type="button" onClick={later} className="mt-2 min-h-11 w-full text-[14.5px] font-medium opacity-80 hover:opacity-100">{t("sp.later")}</button>
        </div>
        <style>{"@keyframes sp-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}"}</style>
      </div>
    );
  }
  if (!dismissed) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-[14px] bg-basil p-3 pl-4 text-basil-ink shadow-float">
        <ClipboardList className="size-5 shrink-0" aria-hidden />
        <p className="flex-1 text-[14px] font-semibold leading-snug">{t("sp.bar")}</p>
        <Button variant="secondary" className="shrink-0 bg-sheet font-bold" onClick={start}>{t("sp.bar_btn")}</Button>
      </div>
    </div>
  );
}
