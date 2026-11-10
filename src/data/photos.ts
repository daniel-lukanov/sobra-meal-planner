import bacalhau from "@/assets/meal-bacalhau.jpg";
import chilli from "@/assets/meal-chilli.jpg";
import gnocchi from "@/assets/meal-gnocchi.jpg";
import soup from "@/assets/meal-soup.jpg";
import chickenRiceLocal from "@/assets/chicken-spinach-rice.jpg";

const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&auto=format&fit=crop&q=80`;

export const photo = {
  roast: u("1598515214211-89d3c73ae83b"),
  potatoSalad: u("1546069901-ba9599a7e63c"),
  tortilla: u("1590412200988-a436970781fa"),
  curry: u("1565557623262-b51c2513a641"),
  riceBowl: u("1512621776951-a57141f2eefd"),
  // The brief's pepper pasta photo no longer exists on Unsplash, so the tuna pasta photo stands in.
  pepperPasta: u("1563379926898-05f4575a45d8"),
  chickenRice: u("1604908176997-125f25cc6f3d"),
  tunaPasta: u("1563379926898-05f4575a45d8"),
  prep: u("1556911220-e15b29be8c8f"),
  bacalhau, chilli, gnocchi, soup, chickenRiceLocal,
};

export const mealPhoto: Record<string, string> = {
  "Roast potatoes with chicken": photo.roast,
  "Chicken and potato hash": photo.roast,
  "Potato salad with tuna": photo.potatoSalad,
  "Potato and carrot soup": photo.soup,
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
