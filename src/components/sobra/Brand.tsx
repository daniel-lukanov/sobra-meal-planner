import { ShoppingBag } from "lucide-react";
import { storeBrand, type StoreName } from "@/data/stores";
import { cn } from "@/lib/utils";

export function SobraMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden className="shrink-0">
      <rect width="34" height="34" rx="10" fill="#1E5631" />
      <path d="M22.5 7.5c3.2-.6 4.8.4 5 1.2-.9 2.4-3.4 3.4-5.6 2.9.1-1.5.2-3 .6-4.1z" fill="#F2E3B6" />
      <path d="M7 16.5h20c0 5.4-4.4 9.5-10 9.5S7 21.9 7 16.5z" fill="#FFFDF9" />
      <rect x="12" y="26.4" width="10" height="1.8" rx=".9" fill="#FFFDF9" />
      <rect x="3.5" y="5" width="11" height="4" rx=".6" fill="#C84B31" transform="rotate(-18 9 7)" />
    </svg>
  );
}

export function SobraLogo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <SobraMark />
      <span className="leading-none">
        <span className={cn("block font-serif font-bold tracking-[-0.02em] text-ink", compact ? "text-[22px]" : "text-[24px]")}>sobra.</span>
        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">lisboa</span>
      </span>
    </span>
  );
}

export function StoreDot({ name, className }: { name: StoreName; className?: string }) {
  const b = storeBrand[name];
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: b.dot, boxShadow: b.ring ? `0 0 0 2px ${b.ring}` : undefined }} />;
}

/** Brand pills keep fixed light tints, so text stays dark in both themes. */
export function StoreBadge({ name, className }: { name: StoreName; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold", className)} style={{ backgroundColor: storeBrand[name].pill, color: "#1E1B18" }}>
      <StoreDot name={name} />
      <ShoppingBag className="size-3.5" strokeWidth={1.8} aria-hidden />
      {name}
    </span>
  );
}
