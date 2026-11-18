import { useMemo } from "react";
import { compute, manualLines, type Result } from "./engine";
import { asStore } from "./sample";
import { useSavings } from "./store";

/** The current result, from the receipt lines (receipt and demo paths) or the picked products (manual path). Null when there is nothing to show. */
export function useResult(): { res: Result | null; manual: boolean } {
  const { path, lines, picks, usualStore, store } = useSavings();
  return useMemo(() => {
    if (path === "manual") {
      if (!usualStore || picks.length === 0) return { res: null, manual: true };
      return { res: compute(manualLines(picks, usualStore, () => ""), usualStore), manual: true };
    }
    if (!path || lines.length === 0) return { res: null, manual: false };
    return { res: compute(lines, asStore(store)), manual: false };
  }, [path, lines, picks, usualStore, store]);
}
