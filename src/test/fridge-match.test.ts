import { describe, expect, it } from "vitest";
import { matchIngredient } from "../lib/fridge-match";

describe("matchIngredient", () => {
  it("matches English and Portuguese names", () => {
    expect(matchIngredient("Carrots")).toBe("carrots");
    expect(matchIngredient("2 cenouras")).toBe("carrots");
    expect(matchIngredient("Grão de bico")).toBe("chickpeas");
    expect(matchIngredient("Limão")).toBe("lemon");
    expect(matchIngredient("minced beef")).toBe("beef-mince");
    expect(matchIngredient("Pescada congelada")).toBe("hake");
  });
  it("prefers the longer phrase", () => {
    expect(matchIngredient("chicken breast")).toBe("chicken-breast");
    expect(matchIngredient("Peito de frango")).toBe("chicken-breast");
    expect(matchIngredient("whole chicken")).toBe("chicken");
  });
  it("leaves unknown items as free text", () => {
    expect(matchIngredient("milk")).toBeNull();
    expect(matchIngredient("yoghurt")).toBeNull();
  });
});
