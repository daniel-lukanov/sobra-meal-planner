import { useState } from "react";
import { cn } from "@/lib/utils";

/** Supporting picture that hides itself if the file is missing. Never pushes the primary button down: height is capped. */
export function Photo({ src, className }: { src: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt="" aria-hidden loading="eager" onError={() => setOk(false)} className={cn("w-full rounded-sheet object-cover", className)} />;
}
