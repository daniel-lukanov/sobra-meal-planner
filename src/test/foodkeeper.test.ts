import { describe, expect, it } from "vitest";
import { candidates, parseFoodKeeper, spanOf, toDays } from "../../db/scripts/foodkeeper";

const row = (o: Record<string, unknown>) => Object.entries(o).map(([k, v]) => ({ [k]: v }));
const json = { sheets: [
  { name: "Category", data: [row({ Category_ID: 7, Category_Name: "Vegetables" })] },
  { name: "Product", data: [
    row({ ID: 1, Category_ID: 7, Name: "Carrots", Name_subtitle: null, Keywords: "carrot", Pantry_Min: null, Refrigerate_Min: 3, Refrigerate_Max: 4, Refrigerate_Metric: "Weeks" }),
    row({ ID: 2, Category_ID: 7, Name: "Carrots", Name_subtitle: "cake", Refrigerate_Min: 3, Refrigerate_Max: 4, Refrigerate_Metric: "Days" }),
    row({ ID: 3, Category_ID: 7, Name: "Rice", Name_subtitle: "white", Pantry_Min: 2, Pantry_Max: 2, Pantry_Metric: "Years" }),
    row({ ID: 5, Category_ID: 7, Name: "Chicken", Name_subtitle: "whole", DOP_Refrigerate_Min: 1, DOP_Refrigerate_Max: 2, DOP_Refrigerate_Metric: "Days", Refrigerate_Min: 9, Refrigerate_Max: 9, Refrigerate_Metric: "Days" }),
    row({ ID: 4, Category_ID: 7, Name: "Honey", Pantry_Min: null, Pantry_Metric: "Indefinitely" }),
  ] },
] };

describe("foodkeeper", () => {
  const items = parseFoodKeeper(json);
  it("reads products with category and subtitle", () => {
    expect(items).toHaveLength(5);
    expect(items[2]).toMatchObject({ id: 3, name: "Rice, white", category: "Vegetables" });
  });
  it("converts ranges to days and leaves open-ended ones empty", () => {
    expect(toDays(3, 4, "Weeks")).toEqual({ min: 21, max: 28 });
    expect(toDays(2, null, "Years")).toEqual({ min: 730, max: 730 });
    expect(toDays(null, null, "Indefinitely")).toBeNull();
    expect(toDays(1, 2, "When Ripe")).toBeNull();
    expect(spanOf(items[0]!, "Refrigerate")).toEqual({ min: 21, max: 28 });
  });
  it("prefers the days from the date of purchase", () => {
    expect(spanOf(items.find((i) => i.id === 5)!, "Refrigerate")).toEqual({ min: 1, max: 2 });
    expect(candidates(items, "chicken").map((c) => c.id)).toEqual([5]);
  });
  it("suggests plain products first and skips unrelated or number-less ones", () => {
    expect(candidates(items, "carrots").map((c) => c.id)).toEqual([1]);
    expect(candidates(items, "rice").map((c) => c.id)).toEqual([3]);
    expect(candidates(items, "tuna")).toEqual([]);
  });
});
