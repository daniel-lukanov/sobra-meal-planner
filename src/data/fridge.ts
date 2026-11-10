export type FridgeItem = { id: string; name: string; daysLeft: number | null; maxDays: number; isNew?: boolean };
export const initialFridge: FridgeItem[] = [
  { id: "spinach", name: "Spinach", daysLeft: 1, maxDays: 5 },
  { id: "chicken", name: "Cooked chicken (from Sunday)", daysLeft: 2, maxDays: 4 },
  { id: "potatoes", name: "Boiled potatoes (from Sunday)", daysLeft: 3, maxDays: 4 },
  { id: "eggs", name: "Eggs", daysLeft: 14, maxDays: 28 },
  { id: "onions", name: "Onions", daysLeft: 18, maxDays: 30 },
];
export const receiptRaw = [
  ["LIDL LISBOA ALVALADE", "09/11/26"],
  ["CENOURA 1KG", "0.79"],
  ["GRAO BICO 3X400G", "1.69"],
  ["PIMENTO MIX 3UN", "1.49"],
  ["ARROZ AGULHA 1KG", "0.99"],
  ["TOTAL", "4.96"],
];
export const receiptRead: { raw: string; item: FridgeItem }[] = [
  { raw: "CENOURA 1KG", item: { id: "carrots", name: "Carrots, 1 kg", daysLeft: 21, maxDays: 28 } },
  { raw: "GRAO BICO 3X400G", item: { id: "chickpeas", name: "Chickpeas, 3 cans", daysLeft: null, maxDays: 1 } },
  { raw: "PIMENTO MIX 3UN", item: { id: "peppers", name: "Bell peppers, 3", daysLeft: 7, maxDays: 10 } },
  { raw: "ARROZ AGULHA 1KG", item: { id: "rice", name: "Long grain rice, 1 kg", daysLeft: null, maxDays: 1 } },
];
