import bacalhau from "@/assets/meal-bacalhau.jpg";
import chilli from "@/assets/meal-chilli.jpg";
import gnocchi from "@/assets/meal-gnocchi.jpg";
import soup from "@/assets/meal-soup.jpg";
import chickenRiceLocal from "@/assets/chicken-spinach-rice.jpg";
import chickpeaCurry from "@/assets/chickpea-curry.jpg";
import tunaPastaLocal from "@/assets/tuna-pasta.jpg";

// Photos are saved locally by scripts/localize-images.ts (public/images/photos/<unsplash id>.jpg).
const u = (id: string) => `/images/photos/${id}.jpg`;

export const photo = {
  roast: u("1598515214211-89d3c73ae83b"),
  potatoSalad: u("1546069901-ba9599a7e63c"),
  tortilla: u("1590412200988-a436970781fa"),
  curry: chickpeaCurry,
  riceBowl: u("1512621776951-a57141f2eefd"),
  // The brief's pepper pasta photo no longer exists on Unsplash, so the tuna pasta photo stands in.
  pepperPasta: u("1563379926898-05f4575a45d8"),
  chickenRice: chickenRiceLocal,
  tunaPasta: tunaPastaLocal,
  prep: u("1556911220-e15b29be8c8f"),
  bacalhau, chilli, gnocchi, soup, chickenRiceLocal,
};

export const mealPhoto: Record<string, string> = {
  "Roast potatoes with chicken": photo.roast,
  "Chicken and potato hash": photo.roast,
  "Potato salad with tuna": photo.potatoSalad,
  "Potato and carrot soup": photo.soup,
  "Carrot and chickpea soup": photo.soup,
  "Chicken fried rice": photo.chickenRiceLocal,
  "Tuna and chickpea salad": photo.potatoSalad,
  "Spinach omelette": photo.tortilla,
  "Spanish tortilla": photo.tortilla,
  "Potato and egg skillet": photo.tortilla,
  "Chickpea curry with rice": photo.curry,
  "Chickpea and spinach stew": photo.curry,
  "Rice bowl with roast peppers and egg": photo.riceBowl,
  "Pepper fried rice": photo.riceBowl,
  "Pasta with roast pepper sauce": photo.pepperPasta,
  "Stuffed peppers with rice": photo.riceBowl,
  "Tuscan chicken": photo.chickenRice,
};

export const categoryPhoto: Record<string, string> = {
  Tortilla: photo.tortilla, Curry: photo.curry, "Rice bowls": photo.riceBowl, Pasta: photo.pepperPasta,
  "Roast chicken": photo.roast, "Potato salad": photo.potatoSalad, "Stir fry": photo.chickenRiceLocal,
  Soups: photo.soup, Wraps: photo.chickenRice, Omelette: photo.tortilla, "Bacalhau à Brás": photo.bacalhau,
  Chilli: photo.chilli, Salads: photo.potatoSalad, Gnocchi: photo.gnocchi,
};

const ing = (id: string) => `/images/photos/${id}.jpg`;
/** Ingredient photos for deal cards, matched by a keyword in the product name. */
const dealPhotos: [RegExp, string][] = [
  [/chicken/i, ing("1604503468506-a8da13d82791")],
  [/potato/i, ing("1518977676601-b53f82aba655")],
  [/egg/i, ing("1582722872445-44dc5f7e3c8f")],
  [/tuna/i, photo.tunaPasta],
  [/beef|mince/i, ing("1588168333986-5078d3ae3976")],
  [/spinach/i, ing("1576045057995-568f588f82fb")],
  [/onion/i, ing("1618512496248-a07fe83aa8cb")],
  [/carrot/i, ing("1598170845058-32b9d6a5da37")],
  [/salmon/i, ing("1499125562588-29fb8a56b5d5")],
  [/chickpea/i, ing("1515543904379-3d757afe72e4")],
  [/pepper/i, ing("1563565375-f3fdfdbefa83")],
  [/rice/i, ing("1586201375761-83865001e31c")],
  [/pesto/i, ing("1592417817098-8fd3d9eb14a5")],
];
export const dealPhoto = (name: string) => dealPhotos.find(([r]) => r.test(name))?.[1] ?? photo.prep;
