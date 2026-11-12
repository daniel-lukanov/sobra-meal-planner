import { storeBrand, type StoreName } from "@/data/stores";
import { cn } from "@/lib/utils";
import pingoDoceLogo from "@/assets/pingo_doce.png.asset.json";
import continenteLogo from "@/assets/continente.png.asset.json";
import lidlLogo from "@/assets/lidl.png.asset.json";
import aldiLogo from "@/assets/aldi.png.asset.json";
import auchanLogo from "@/assets/auchan.png.asset.json";

export function SobraMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden className="shrink-0">
      <circle cx="17" cy="17" r="17" fill="#1E7B3E" />
      <path d="M12.6 10.5h11.4a1.6 1.6 0 0 1 1.6 1.6v9.8a1.6 1.6 0 0 1-1.6 1.6H12.6L7.8 17z" fill="#FFFFFF" />
      <circle cx="17.6" cy="17" r="2.6" fill="#1E7B3E" />
      <circle cx="17.6" cy="17" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}

export function SobraLogo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <SobraMark />
      <span className="leading-none">
        <span className={cn("block font-medium font-serif tracking-[-0.02em] text-ink", compact ? "text-[22px]" : "text-[24px]")}>pratico</span>
        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">lisboa</span>
      </span>
    </span>
  );
}

/** Official supermarket logos, published to the app's media storage. */
const storeLogos: Record<StoreName, string> = {
  "Pingo Doce": pingoDoceLogo.url,
  Continente: continenteLogo.url,
  Lidl: lidlLogo.url,
  Aldi: aldiLogo.url,
  Auchan: auchanLogo.url,
};

export function StoreLogo({ name, className }: { name: StoreName; className?: string }) {
  return <img src={storeLogos[name]} alt="" aria-hidden className={cn("h-5 w-auto shrink-0 object-contain", className)} />;
}

export function StoreDot({ name, className }: { name: StoreName; className?: string }) {
  const b = storeBrand[name];
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: b.dot, boxShadow: b.ring ? `0 0 0 2px ${b.ring}` : undefined }} />;
}

/** Brand pills keep fixed light tints, so the mark stays readable in both themes. */
export function StoreBadge({ name, className }: { name: StoreName; className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center rounded-[6px] px-3 py-1.5", className)} style={{ backgroundColor: storeBrand[name].pill }}>
      <StoreLogo name={name} className="h-5" />
    </span>
  );
}
