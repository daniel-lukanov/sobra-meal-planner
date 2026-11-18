import { describe, expect, it } from "vitest";
import { dealPhoto, photo } from "@/data/photos";

describe("dealPhoto", () => {
  it("finds the generated ingredient photos", () => {
    for (const k of ["olive oil", "spaghetti", "coconut milk", "soy sauce", "lemon", "Azeite Virgem Extra"]) expect(dealPhoto(k)).toMatch(/^\/images\/deals\//);
  });
  it("keeps the existing ones and the fallback", () => {
    expect(dealPhoto("chicken breast")).not.toMatch(/deals/);
    expect(dealPhoto("zzz")).toBe(photo.prep);
  });
});
