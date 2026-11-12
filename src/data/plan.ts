import type { IngredientId } from "./ingredients";
import { photo } from "./photos";

export type Meal = { title: string; how: string; uses: IngredientId[]; price: number };
export type PrepRow = { kind: "prep"; day: string; title: string; meta: string; tags: string[]; note?: string };
export type DayRow = { kind: "day"; day: string; options: Meal[] };
export type PlanRow = PrepRow | DayRow;

export const weekPlan: PlanRow[] = [
  { kind: "prep", day: "Sun", title: "Prep session 1", meta: "45 min · boil, roast and chop once", tags: ["1.5 kg potatoes", "1 kg chicken thighs", "3 onions", "4 carrots"], note: "Cooked food keeps 3 to 4 days, so a second short prep on Wednesday covers the rest of the week." },
  { kind: "day", day: "Mon", options: [
    { title: "Roast potatoes with chicken", how: "Reheat in the pan, 10 min", uses: ["potatoes", "chicken", "carrots"], price: 2.4 },
    { title: "Chicken and potato hash", how: "Crisp it all in one pan, 12 min", uses: ["potatoes", "chicken", "onion"], price: 2.3 },
  ] },
  { kind: "day", day: "Tue", options: [
    { title: "Potato salad with tuna", how: "New dressing, red onion, 10 min", uses: ["potatoes", "onion", "tuna"], price: 2.1 },
    { title: "Potato and carrot soup", how: "Blend with stock, 15 min", uses: ["potatoes", "carrots", "onion"], price: 1.6 },
  ] },
  { kind: "day", day: "Wed", options: [
    { title: "Spanish tortilla", how: "Last potatoes with eggs, 15 min", uses: ["potatoes", "eggs", "onion"], price: 1.9 },
    { title: "Potato and egg skillet", how: "Fry, crack the eggs on top, 12 min", uses: ["potatoes", "eggs", "onion"], price: 1.85 },
  ] },
  { kind: "prep", day: "Wed", title: "Prep session 2", meta: "25 min · cook rice, roast peppers, chickpea base", tags: ["600 g rice", "3 peppers", "3 cans chickpeas"] },
  { kind: "day", day: "Thu", options: [
    { title: "Chickpea curry with rice", how: "Heat the base, add spinach, 12 min", uses: ["chickpeas", "rice", "spinach"], price: 1.8 },
    { title: "Chickpea and spinach stew", how: "Simmer the base with spinach, 12 min", uses: ["chickpeas", "spinach", "onion"], price: 1.7 },
  ] },
  { kind: "day", day: "Fri", options: [
    { title: "Rice bowl with roast peppers and egg", how: "Fry an egg, assemble, 10 min", uses: ["rice", "peppers", "eggs"], price: 1.95 },
    { title: "Pepper fried rice", how: "Stir fry with an egg, 10 min", uses: ["rice", "peppers", "eggs"], price: 1.9 },
  ] },
  { kind: "day", day: "Sat", options: [
    { title: "Pasta with roast pepper sauce", how: "Blend the peppers, 15 min", uses: ["peppers", "onion"], price: 1.7 },
    { title: "Stuffed peppers with rice", how: "Fill and bake, 20 min", uses: ["peppers", "rice", "onion"], price: 1.85 },
  ] },
];


export type Pick = { id: string; title: string; minutes: number; price: number; reason: string; tone: "basil" | "mustard" | "neutral"; image: string; alt: string; summary: string };

export const dailyPicks: Pick[] = [
  { id: "rice", title: "Chicken and spinach rice", minutes: 22, price: 2.35, reason: "Uses spinach that expires tomorrow", tone: "basil", image: photo.chickenRice, alt: "Bowl of rice with pan-fried chicken pieces and wilted spinach", summary: "You have rice, chicken and spinach. Missing: soy sauce, €1.29 at" },
  { id: "curry", title: "Chickpea curry", minutes: 25, price: 1.8, reason: "Chickpeas on deal this week", tone: "mustard", image: photo.curry, alt: "Chickpea curry and white rice side by side in a frying pan", summary: "You have chickpeas, rice and onion. Missing: coconut milk, €0.99 at" },
  { id: "pasta", title: "Tuna pasta with lemon", minutes: 15, price: 1.95, reason: "Fastest option tonight", tone: "neutral", image: photo.tunaPasta, alt: "Plate of spaghetti with tuna, lemon zest and parsley", summary: "You have tuna and onion. Missing: spaghetti, €0.89 at" },
];

export const dietOptions = ["Meat", "Fish", "Vegetarian", "Vegan", "High protein", "No pork"];
export const mealOptions = ["Tortilla", "Curry", "Rice bowls", "Pasta", "Roast chicken", "Potato salad", "Stir fry", "Soups", "Wraps", "Omelette", "Bacalhau à Brás", "Chilli", "Salads", "Gnocchi"];

/** Extra dinners Swap can offer, built from the same prepped bases. */
export const extraMeals: Meal[] = [
  { title: "Chicken fried rice", how: "Stir fry with an egg, 12 min", uses: ["chicken", "rice", "eggs"], price: 2.2 },
  { title: "Tuna and chickpea salad", how: "Mix, dress, 8 min", uses: ["tuna", "chickpeas", "onion"], price: 1.9 },
  { title: "Carrot and chickpea soup", how: "Blend with stock, 15 min", uses: ["carrots", "chickpeas", "onion"], price: 1.5 },
  { title: "Spinach omelette", how: "Wilt, add eggs, 10 min", uses: ["eggs", "spinach", "onion"], price: 1.6 },
];
