export type Step = { text: string; timer?: number; meanwhile?: string };
export const relaxedSteps: Step[] = [
  { text: "Put the rice on with 2 cups of water and a pinch of salt.", timer: 720, meanwhile: "While it cooks, slice the chicken. You have 12 minutes." },
  { text: "Slice the chicken into thin strips and season with salt and paprika." },
  { text: "Fry the chicken over high heat until golden.", timer: 360, meanwhile: "Meanwhile, wash the spinach." },
  { text: "Add the spinach and a splash of soy sauce. Stir for one minute.", timer: 60 },
  { text: "Serve the chicken and spinach over the rice." },
];
export const fastSteps: Step[] = [
  { text: "Microwave the rice pouch and fry the chicken strips at the same time.", timer: 360, meanwhile: "One pan, one bowl. Done in 8 minutes." },
  { text: "Add the spinach and soy sauce, stir 1 min, serve over the rice.", timer: 60 },
];
export const cookIngredients = [
  { name: "Rice", qty: "150 g", note: "from Wednesday prep" },
  { name: "Chicken thighs", qty: "200 g", note: "in fridge" },
  { name: "Spinach", qty: "150 g", note: "expires tomorrow" },
  { name: "Soy sauce", qty: "1 tbsp", note: "pantry" },
];
export type Block = { start: number; end: number; label: string; tone: "basil" | "ink" | "mustard"; detail: string };
export const prepLanes: { lane: string; blocks: Block[] }[] = [
  { lane: "Hob", blocks: [
    { start: 0, end: 25, label: "Boil 1.5 kg potatoes", tone: "basil", detail: "Salted water, lid on. Drain and keep half whole for the tortilla." },
    { start: 28, end: 40, label: "Rice for Thu", tone: "ink", detail: "Cook 600 g rice, cool fast on a tray before boxing." },
  ] },
  { lane: "Oven", blocks: [
    { start: 5, end: 45, label: "Roast 1 kg chicken thighs at 200 °C", tone: "mustard", detail: "Skin up, salt and paprika. Turn once at 25 min." },
  ] },
  { lane: "Board", blocks: [
    { start: 0, end: 5, label: "Chicken in", tone: "basil", detail: "Season the thighs and get them in the oven first." },
    { start: 8, end: 22, label: "Chop onions and carrots, 3 days", tone: "ink", detail: "3 onions and 4 carrots. Box them for Monday to Wednesday." },
    { start: 30, end: 40, label: "Cool and box", tone: "ink", detail: "Label each box with the day. Fridge within 2 hours." },
  ] },
];
