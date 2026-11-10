import { useState } from "react";
import { Compass } from "lucide-react";
import { useExp } from "@/lib/experiment";
import { Button } from "./ui";
import { VerdictModal } from "./VerdictModal";

export function MissionBar() {
  const s = useExp((x) => x.session);
  const [open, setOpen] = useState(false);
  if (!s || s.survey_post_completed) return null;
  const steps = (s.initial_mode_switched ? 1 : 0) + (s.deals_tab_visited || s.fridge_receipt_scanned ? 1 : 0);
  return (
    <>
      <div className="fixed inset-x-2 bottom-[68px] z-30 md:bottom-4 md:left-[244px] md:right-6">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-3 rounded-[16px] border border-mustard bg-mustard-tint px-4 py-2.5 shadow-[var(--shadow-card)]">
          <Compass className="hidden size-5 shrink-0 text-[var(--mustard-ink)] sm:block" strokeWidth={1.7} aria-hidden />
          <p className="min-w-0 flex-1 text-[13.5px] leading-snug">
            <span className="font-semibold">Quick test:</span> 1. Try Weekly Prep vs Daily Pick · 2. Check Deals or scan a receipt in Fridge
            <span className="num ml-2 rounded-full bg-sheet px-2 py-0.5 text-[12px] font-semibold" aria-live="polite">{steps}/2 explored</span>
          </p>
          <Button className="min-h-10 px-3.5 text-[14px]" onClick={() => setOpen(true)}>Give 20-sec verdict</Button>
        </div>
      </div>
      <VerdictModal open={open} onOpenChange={setOpen} />
    </>
  );
}
