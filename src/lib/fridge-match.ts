// Match a hand-typed fridge item ("2 carrots", "Peito de frango") to an ingredient slug, so recipes and the shopping list see it.
// Fridge items are keyed by the ingredient slug (see FRIDGE_SLUG); anything that does not match stays a free-text item.

const ALIASES: Record<string, string[]> = {
  potatoes: ["potato", "potatoes", "batata", "batatas"],
  onion: ["onion", "onions", "cebola", "cebolas"],
  carrots: ["carrot", "carrots", "cenoura", "cenouras"],
  eggs: ["egg", "eggs", "ovo", "ovos"],
  rice: ["rice", "arroz"],
  chickpeas: ["chickpea", "chickpeas", "grao de bico", "graos de bico", "grao-de-bico"],
  peppers: ["pepper", "peppers", "bell pepper", "bell peppers", "pimento", "pimentos"],
  tuna: ["tuna", "atum", "canned tuna"],
  spinach: ["spinach", "espinafre", "espinafres"],
  "chicken-breast": ["chicken breast", "peito de frango"],
  "chicken-thighs": ["chicken thigh", "chicken thighs", "coxa de frango", "sobrecoxa de frango", "sobrecoxas de frango"],
  chicken: ["chicken", "frango"],
  spaghetti: ["spaghetti", "esparguete", "pasta", "massa"],
  "coconut-milk": ["coconut milk", "leite de coco"],
  lemon: ["lemon", "lemons", "limao", "limoes"],
  "soy-sauce": ["soy sauce", "molho de soja"],
  "olive-oil": ["olive oil", "azeite"],
  "beef-mince": ["beef mince", "minced beef", "ground beef", "carne picada", "carne picada de vaca"],
  "pork-loin": ["pork loin", "pork", "lombo de porco", "lombo", "porco"],
  hake: ["hake", "white fish", "pescada"],
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const TABLE = Object.entries(ALIASES).flatMap(([slug, al]) => al.map((a) => ({ slug, a: norm(a) }))).sort((x, y) => y.a.length - x.a.length);

/** The ingredient slug a typed fridge item stands for, or null. A whole-word phrase match, longest alias first ("chicken breast" before "chicken"). */
export function matchIngredient(text: string): string | null {
  const t = ` ${norm(text)} `;
  for (const { slug, a } of TABLE) if (t.includes(` ${a} `)) return slug;
  return null;
}
