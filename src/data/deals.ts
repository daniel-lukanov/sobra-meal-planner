import type { IngredientId } from "./ingredients";
import type { StoreName } from "./stores";

export type Deal = {
  name: string;
  ingredient: IngredientId | null;
  price: number;
  was: number;
  cheapestRegular: number;
};

const d = (name: string, ingredient: IngredientId | null, price: number, was: number, cheapestRegular: number): Deal => ({ name, ingredient, price, was, cheapestRegular });

export const dealsByStore: Record<StoreName, Deal[]> = {
  "Pingo Doce": [
    d("Chicken thighs 1 kg", "chicken", 3.49, 5.29, 4.69),
    d("Potatoes 3 kg", "potatoes", 2.29, 3.49, 2.99),
    d("Free-range eggs 12", "eggs", 2.79, 3.59, 3.19),
    d("Canned tuna 3 pack", "tuna", 2.49, 3.99, 2.99),
    d("Angus beef mince 500 g", null, 6.99, 9.49, 4.49),
    d("Spinach 300 g", "spinach", 1.19, 1.79, 1.49),
  ],
  Continente: [
    d("Chicken breast 1 kg", "chicken", 4.99, 6.99, 5.79),
    d("Onions 2 kg", "onion", 1.49, 2.29, 1.89),
    d("Salmon fillets 400 g", null, 5.99, 7.99, 5.49),
    d("Carrots 1 kg", "carrots", 0.79, 1.19, 0.99),
  ],
  Lidl: [
    d("Potatoes 2 kg", "potatoes", 1.59, 2.29, 1.99),
    d("Chickpeas 3 cans", "chickpeas", 1.69, 2.49, 1.99),
    d("Premium pesto 190 g", null, 2.99, 3.99, 2.49),
    d("Bell peppers 3 pack", "peppers", 1.49, 1.99, 1.79),
  ],
  Aldi: [
    d("Long grain rice 1 kg", "rice", 0.99, 1.49, 1.19),
    d("Eggs 10", "eggs", 1.89, 2.39, 2.09),
    d("Organic carrots 1 kg", "carrots", 1.29, 1.59, 0.99),
  ],
  Auchan: [
    d("Chicken drumsticks 1 kg", "chicken", 2.99, 4.49, 3.59),
    d("Red onions 1 kg", "onion", 0.99, 1.49, 1.19),
    d("Baby spinach 200 g", "spinach", 1.29, 1.99, 1.49),
  ],
};

/** A deal is real only when it beats the cheapest regular alternative. */
export function realSaving(deal: Deal): number {
  return Math.round((deal.cheapestRegular - deal.price) * 100) / 100;
}
export function isRealDeal(deal: Deal): boolean {
  return realSaving(deal) > 0;
}
