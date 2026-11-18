import { describe, expect, it } from "vitest";
import type { Meal } from "@/data/plan";
import { mainProtein, representative } from "@/lib/representative";

const meal = (title: string, cuisine: string, type: string, flags: Partial<NonNullable<Meal["flags"]>> = {}, tags: string[] = []): Meal => ({
  title, how: "", uses: [], price: 1, cuisine, type, tags,
  flags: { meat: false, fish: false, egg: false, dairy: false, pork: false, ...flags },
});

describe("representative", () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => meal(`Portuguese chicken ${i}`, "Portuguese", "roast-chicken", { poultry: true, meat: true })),
    meal("Thai curry", "Asian", "curry"), meal("Tuna pasta", "Italian", "pasta", { fish: true, finfish: true }),
    meal("Tortilla", "Spanish", "tortilla", { egg: true }), meal("Chilli", "Mexican", "stew"),
  ];
  it("spreads over cuisines before repeating one", () => {
    const got = representative(pool, 5).map((m) => m.cuisine);
    expect(new Set(got).size).toBe(5);
  });
  it("returns everything when there are fewer than n", () => {
    expect(representative(pool.slice(0, 3), 15)).toHaveLength(3);
  });
  it("is deterministic", () => {
    expect(representative(pool, 6).map((m) => m.title)).toEqual(representative([...pool].reverse(), 6).map((m) => m.title));
  });
  it("names the main protein", () => {
    expect(mainProtein(pool[0]!)).toBe("poultry");
    expect(mainProtein(pool[11]!)).toBe("fish");
    expect(mainProtein(pool[12]!)).toBe("egg");
    expect(mainProtein(pool[13]!)).toBe("plant");
  });
});
