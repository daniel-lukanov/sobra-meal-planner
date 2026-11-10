export type IngredientId =
  | "potatoes" | "chicken" | "onion" | "carrots" | "eggs"
  | "rice" | "chickpeas" | "peppers" | "tuna" | "spinach";

export const ingredientColors: Record<IngredientId, string> = {
  potatoes: "#D9A441",
  chicken: "#B8643A",
  onion: "#8C6BB1",
  carrots: "#E07B2C",
  eggs: "#E8C547",
  rice: "#C9C3B0",
  chickpeas: "#C7A25A",
  peppers: "#D2412F",
  tuna: "#5F7F99",
  spinach: "#3F8A4A",
};
