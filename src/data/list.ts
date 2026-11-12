export type ListItem = { id: string; name: string; price: number | null; inFridge?: boolean };
export const shoppingList: { aisle: string; items: ListItem[] }[] = [
  { aisle: "Fruit and veg", items: [
    { id: "potatoes", name: "Potatoes 3 kg", price: 2.29 },
    { id: "carrots", name: "Carrots 1 kg", price: 0.79 },
    { id: "peppers", name: "Peppers 3 pack", price: 1.49 },
    { id: "onion", name: "Onions", price: null, inFridge: true },
    { id: "spinach", name: "Spinach 300 g", price: 1.19 },
  ] },
  { aisle: "Meat and fish", items: [
    { id: "chicken", name: "Chicken thighs 1 kg", price: 3.49 },
    { id: "tuna", name: "Canned tuna 3 pack", price: 2.49 },
  ] },
  { aisle: "Eggs and dairy", items: [{ id: "eggs", name: "Free-range eggs 12", price: 2.79 }] },
  { aisle: "Pantry", items: [
    { id: "rice", name: "Rice 1 kg", price: null, inFridge: true },
    { id: "chickpeas", name: "Chickpeas 3 cans", price: 1.69 },
  ] },
];
