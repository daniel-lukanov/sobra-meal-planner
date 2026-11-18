import { describe, expect, it } from "vitest";
import { RULES, mapToIngredient } from "../../db/scripts/continente";

const map = (name: string, cat = "Talho") => { for (const r of RULES) { const s = mapToIngredient(r, name, cat); if (s) return s; } return null; };

describe("beef, pork and hake rules", () => {
  it("accepts the right products", () => {
    expect(map("Preparado de Carne Picada Bovino 500gr")).toBe("beef-mince");
    expect(map("Carne Picada de Vaca Continente")).toBe("beef-mince");
    expect(map("Lombo de Porco Fatiado")).toBe("pork-loin");
    expect(map("Bifanas de Porco Nosso Talho")).toBe("pork-loin");
    expect(map("Posta de Pescada Auchan MSC", "Congelados/Peixe")).toBe("hake");
    expect(map("Filetes de Pescada Congelados", "Congelados")).toBe("hake");
  });
  it("rejects look-alikes", () => {
    expect(map("Preparado de Carne Picada de Suíno Isento de Glúten")).toBeNull();
    expect(map("Carne Picada Mista")).toBeNull();
    expect(map("Filetes de Pescada em Farinha e Ovo Pescanova", "Congelados")).toBeNull();
    expect(map("Filetes de Pescada com Limão", "Congelados")).toBeNull();
    expect(map("Lombinho de Porco 4 Pimentas Elpozo")).toBeNull();
    expect(map("Espetadas de Porco Preto com Pimentos")).toBeNull();
    expect(map("Barrinhas de Pescada sem Glúten", "Congelados")).toBeNull();
    expect(map("Lombinho de Porco com Farinheira e Castanhas")).toBeNull();
    expect(map("Lombinho de Porco com Cogumelos e Trufa")).toBeNull();
  });
});
