import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("guided tour", () => {
  const src = readFileSync("src/components/pratico/GuidedTour.tsx", "utf8");
  it("has six steps and every step with a page has an anchor on it", () => {
    for (const n of [1, 2, 3, 4, 5, 6]) expect(src).toContain(`  ${n}: {`);
    const anchors: Record<string, string> = { "4": "src/routes/list.tsx", "5": "src/routes/household.tsx", "1": "src/routes/index.tsx", "2": "src/routes/deals.tsx", "3": "src/routes/fridge.tsx" };
    for (const [n, f] of Object.entries(anchors)) expect(readFileSync(f, "utf8")).toMatch(new RegExp(`data-tour=(\\{[^}]*"${n}"[^}]*\\}|"${n}")`));
  });
  it("no longer ends at step 4 and still offers Skip", () => {
    expect(src).not.toContain("step === 4");
    expect(src).toContain("Skip tour");
  });
});
