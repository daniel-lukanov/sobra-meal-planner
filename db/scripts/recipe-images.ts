// Recipe photos made with a local Ollama image model, reviewed by you, then stored in Supabase Storage. Run with Bun on your Mac:
//   bun db/scripts/recipe-images.ts --limit 3            make 3 drafts for recipes without an image (nothing uploaded)
//   bun db/scripts/recipe-images.ts --only slug1,slug2   make drafts for these recipes (also redoes ones that have an image)
//   bun db/scripts/recipe-images.ts                      drafts for every recipe without an image
//   open data/raw/recipe-images/index.html               look at the drafts (delete a .jpg you don't like and rerun with --only <slug> --seed 2)
//   bun db/scripts/recipe-images.ts --publish            upload the drafts to the recipe-images bucket and set recipe.image_url
// Options: --redo (draw again even if a draft exists)   --provider openai|mflux|ollama (default openai)   --model NAME   --width 1200 --height 800   --steps N   --seed N   --dry
// Providers:
//   openai  OpenAI image API. Needs OPENAI_API_KEY in db/.env. Model default gpt-image-1, medium quality. Costs a few euros for all recipes.
//   mflux   Local FLUX on Apple silicon: install once with `uv tool install mflux` (or `pipx install mflux`); runs `mflux-generate`. Free.
//   ollama  Local Ollama image model (experimental; not working on every Mac).
// Needs: macOS `sips` (built in) and db/.env (SUPABASE_URL, SUPABASE_SECRET_KEY). Keys are never printed.
// Prompts use only each recipe's real ingredients and its diet (from the database), so a vegan dish never shows meat or egg.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ENV_ALL: Record<string, string> = {};
function loadEnv(): { url: string; key: string } {
  const f = new URL("../.env", import.meta.url).pathname;
  if (!existsSync(f)) throw new Error("db/.env not found.");
  const env: Record<string, string> = {};
  for (const line of readFileSync(f, "utf8").split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) { env[m[1]!] = m[2]!.trim(); ENV_ALL[m[1]!] = m[2]!.trim(); } }
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("db/.env needs SUPABASE_URL and SUPABASE_SECRET_KEY");
  return { url: env.SUPABASE_URL.replace(/\/+$/, ""), key: env.SUPABASE_SECRET_KEY };
}
const env = loadEnv();
async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${env.url}/rest/v1/${path}`, { ...init, headers: { apikey: env.key, "Content-Type": "application/json", ...(init.headers as object) } });
  if (!res.ok) throw new Error(`DB ${res.status} on ${path.split("?")[0]}: ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1]! : d; };
const PROVIDER = opt("provider", "openai");
const MODEL = opt("model", PROVIDER === "ollama" ? "x/z-image-turbo" : PROVIDER === "mflux" ? "z-image-turbo" : "gpt-image-1"), W = Number(opt("width", "1200")), H = Number(opt("height", "800"));
const STEPS = opt("steps", ""), SEED0 = Number(opt("seed", "0")), LIMIT = Number(opt("limit", "0"));
const REDO = flag("redo");
const ONLY = opt("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const OLLAMA = opt("ollama", "http://localhost:11434");
const DIR = new URL("../../data/raw/recipe-images/", import.meta.url).pathname; // git-ignored

// One look for the whole set: same light, table and plate style, so the dishes read as one collection.
const STYLE = "Professional food photography, natural window light from the left, warm and vibrant natural colours, appetising and freshly cooked, glossy and moist, fresh herb garnish, simple white ceramic bowl or plate on a light wooden table, shallow depth of field, sharp focus on the food, no text, no hands, no packaging, no logos.";

// What each ingredient looks like once cooked, so soups and sauces get a blended colour instead of separate piles.
const COLOUR: Record<string, string> = { carrots: "orange", chickpeas: "beige", spinach: "deep green", potatoes: "cream", peppers: "red", tomatoes: "red", eggs: "yellow", lemons: "pale yellow", "coconut milk": "creamy white", tuna: "pale pink", rice: "white", onions: "", chicken: "golden brown", garlic: "" };
const colourOf = (n: string) => COLOUR[n] ?? "";
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** Describe the finished dish the way it looks on the plate. Soups are smooth and one blended colour; curries are saucy; and so on. */
function look(type: string, title: string, names: string[]): string {
  const main = names.filter((n) => n !== "onions" && n !== "lemons");
  const colours = [...new Set(main.map(colourOf).filter(Boolean))];
  const has = (n: string) => names.includes(n);
  switch (type) {
    case "soups": return `${title}: a bowl of smooth, velvety, creamy blended soup. The whole soup is one uniform colour, a blend of ${list(colours.length ? colours : ["the vegetables"])}, with no visible chunks, beans or whole vegetables. A swirl of olive oil, a few fresh herbs and a slice of crusty bread beside it, gentle steam rising. Shot from a 45 degree angle so the surface of the soup is visible.`;
    case "curry": return `${title}: a bowl of thick, glossy, golden curry sauce with tender pieces of ${list(main.filter((n) => n !== "rice" && n !== "coconut milk").slice(0, 2)) || "vegetables"}, fluffy white rice beside it, fresh coriander on top. Shot from a 45 degree angle.`;
    case "chilli": return `${title}: a bowl of rich, thick, deep red stew with tender ${list(main.slice(0, 2))}, served with rice, fresh herbs on top, steam rising. Shot from a 45 degree angle.`;
    case "salads": return `${title}: a fresh, colourful salad on a wide plate, ingredients neatly cut and tossed together with a glistening lemon and olive oil dressing: ${list(main.slice(0, 4))}. Overhead shot.`;
    case "potato-salad": return `${title}: a bright potato salad with tender chunks of potato, glistening dressing and fresh herbs, with ${list(main.filter((n) => n !== "potatoes").slice(0, 2))}. Overhead shot.`;
    case "pasta": return `${title}: a plate of spaghetti twirled into a nest, coated in a glossy sauce with ${list(main.filter((n) => n !== "spaghetti").slice(0, 3))}, fresh herbs on top. Overhead shot.`;
    case "rice-bowls": return `${title}: a rice bowl with fluffy rice and toppings arranged in neat sections: ${list(main.filter((n) => n !== "rice").slice(0, 3))}, finished with a drizzle of olive oil. Overhead shot.`;
    case "omelette": return `${title}: a golden, softly folded omelette, lightly browned, filled with ${list(main.filter((n) => n !== "eggs").slice(0, 2))}, on a plate with fresh herbs. Overhead shot.`;
    case "tortilla": return `${title}: a thick golden Spanish tortilla with one slice cut out to show the soft layers of potato and egg inside. Overhead shot.`;
    case "stir-fry": return `${title}: a glossy stir fry in a pan, vivid ${list(main.slice(0, 3))} with a shiny sauce, steam rising, fresh herbs on top. Shot from a 45 degree angle.`;
    case "roast-chicken": return `${title}: golden roasted ${has("chicken") ? "chicken pieces with crisp browned skin" : "dish"} with roasted ${list(main.filter((n) => n !== "chicken").slice(0, 3))}, in a roasting tray with herbs. Shot from a 45 degree angle.`;
    default: return `${title}: a beautifully plated home-cooked dish with ${list(main.slice(0, 4))}. Overhead shot.`;
  }
}

type Row = { id: string; slug: string; title: string; meal_type: string; summary: string | null; image_url: string | null };
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

async function prompts(rows: Row[]) {
  const ids = rows.map((r) => r.id).join(",");
  const lines: { recipe_id: string; ingredient: { name: string; is_pantry_staple: boolean } }[] = await rest(`recipe_ingredient?select=recipe_id,ingredient(name,is_pantry_staple)&recipe_id=in.(${ids})&is_optional=eq.false`);
  const diets: { recipe_id: string; is_vegan: boolean; is_vegetarian: boolean }[] = await rest(`recipe_diets?select=recipe_id,is_vegan,is_vegetarian&recipe_id=in.(${ids})`);
  return new Map(rows.map((r) => {
    const names = lines.filter((l) => l.recipe_id === r.id && !l.ingredient.is_pantry_staple).map((l) => l.ingredient.name.toLowerCase());
    const d = diets.find((x) => x.recipe_id === r.id);
    const rule = d?.is_vegan ? " Fully plant-based: no meat, no fish, no egg, no cheese." : d?.is_vegetarian ? " Vegetarian: no meat and no fish." : "";
    return [r.slug, `${look(r.meal_type, r.title, names)}${rule} ${STYLE}`];
  }));
}

/** One image as PNG/JPEG bytes from the chosen provider. This is the only part that differs between providers. */
async function generate(prompt: string, seed: number): Promise<Buffer> {
  if (PROVIDER === "openai") {
    const key = ENV_ALL.OPENAI_API_KEY;
    if (!key) throw new Error("Add OPENAI_API_KEY=... to db/.env (a line of its own), then rerun.");
    const r = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: MODEL, prompt, size: "1536x1024", quality: "medium", n: 1 }) });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { data?: { b64_json?: string; url?: string }[] };
    const d = j.data?.[0];
    if (d?.b64_json) return Buffer.from(d.b64_json, "base64");
    if (d?.url) return Buffer.from(await (await fetch(d.url)).arrayBuffer());
    throw new Error("OpenAI returned no image.");
  }
  if (PROVIDER === "mflux") {
    const out = join(DIR, `_tmp-${seed}.png`);
    // z-image-turbo has its own command; any other model name goes through mflux-generate (e.g. --model schnell).
    const native = MODEL === "z-image-turbo";
    const cmd = native ? "mflux-generate-z-image-turbo" : "mflux-generate";
    const a = [...(native ? [] : ["--model", MODEL]), "--prompt", prompt, "--width", String(W), "--height", String(H), "--seed", String(seed), ...(STEPS ? ["--steps", STEPS] : []), "--output", out];
    try { execFileSync(cmd, a, { stdio: "inherit" }); } catch { throw new Error(`${cmd} failed. Is it on your PATH (uv tool update-shell, then a new tab)? Try: ${cmd} --help`); }
    const b = readFileSync(out); rmSync(out); return b;
  }
  // Ollama: OpenAI-compatible endpoint first, then /api/generate.
  const attempts: (() => Promise<string | null>)[] = [
    async () => {
      const r = await fetch(`${OLLAMA}/v1/images/generations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: MODEL, prompt, size: `${W}x${H}`, response_format: "b64_json" }) });
      if (!r.ok) return null;
      const j = (await r.json()) as { data?: { b64_json?: string }[] };
      return j.data?.[0]?.b64_json ?? null;
    },
    async () => {
      const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: MODEL, prompt, stream: false, width: W, height: H, seed, ...(STEPS ? { steps: Number(STEPS) } : {}) }) });
      if (!r.ok) throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = (await r.json()) as { image?: string; images?: string[] };
      return j.image ?? j.images?.[0] ?? null;
    },
  ];
  for (const a of attempts) { const b64 = await a(); if (b64) return Buffer.from(b64, "base64"); }
  throw new Error("Ollama returned no image (check ollama list and your version).");
}

function toJpeg(png: string, jpg: string) {
  for (const q of [82, 70, 58]) {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(q), "--resampleWidth", String(W), png, "--out", jpg], { stdio: "ignore" });
    if (statSync(jpg).size < 950_000) return; // the bucket allows files under 1 MB
  }
}

function contactSheet() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".jpg")).sort();
  const html = `<!doctype html><meta charset="utf-8"><title>Recipe image drafts</title><style>body{font:14px system-ui;margin:20px;background:#faf8f4}div{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}figure{margin:0}img{width:100%;border-radius:8px}figcaption{padding:4px 0}</style><h1>${files.length} drafts</h1><div>${files.map((f) => `<figure><img src="${f}" loading="lazy"><figcaption>${f.replace(".jpg", "")}</figcaption></figure>`).join("")}</div>`;
  writeFileSync(join(DIR, "index.html"), html);
}

async function drafts() {
  mkdirSync(DIR, { recursive: true });
  let rows: Row[] = await rest("recipe?select=id,slug,title,meal_type,summary,image_url&status=eq.published&order=slug");
  rows = ONLY.length ? rows.filter((r) => ONLY.includes(r.slug)) : rows.filter((r) => !r.image_url && (REDO || !existsSync(join(DIR, `${r.slug}.jpg`))));
  if (LIMIT) rows = rows.slice(0, LIMIT);
  if (ONLY.length) for (const s of ONLY) if (!rows.some((r) => r.slug === s)) console.log(`No published recipe with slug "${s}".`);
  console.log(`${rows.length} recipe(s) to draw with ${PROVIDER}/${MODEL} at ${W}x${H}${flag("dry") ? " (dry run)" : ""}.`);
  const p = await prompts(rows);
  if (flag("dry")) { for (const [slug, text] of p) console.log(`\n${slug}\n  ${text}`); return; }
  let n = 0;
  for (const r of rows) {
    const t0 = Date.now();
    try {
      const png = await generate(p.get(r.slug)!, hash(r.slug) + SEED0);
      const tmp = join(DIR, `${r.slug}.png`);
      writeFileSync(tmp, png);
      toJpeg(tmp, join(DIR, `${r.slug}.jpg`));
      rmSync(tmp);
      n++;
      console.log(`${n}/${rows.length} ${r.slug} (${Math.round((Date.now() - t0) / 1000)} s)`);
    } catch (e) { console.error(`FAILED ${r.slug}: ${(e as Error).message}`); if (n === 0) break; }
    contactSheet();
  }
  contactSheet();
  console.log(`\nDrafts are in ${DIR}\nLook: open ${join(DIR, "index.html")}\nHappy? bun db/scripts/recipe-images.ts --publish`);
}

async function publish() {
  const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".jpg")) : [];
  if (files.length === 0) { console.log("No drafts to publish."); return; }
  const stamp = Date.now();
  for (const f of files) {
    const slug = f.replace(".jpg", "");
    const up = await fetch(`${env.url}/storage/v1/object/recipe-images/${slug}.jpg`, { method: "POST", headers: { apikey: env.key, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: readFileSync(join(DIR, f)) });
    if (!up.ok) { console.error(`Upload failed for ${slug}: ${up.status} ${(await up.text()).slice(0, 200)}`); continue; }
    await rest(`recipe?slug=eq.${slug}`, { method: "PATCH", body: JSON.stringify({ image_url: `${env.url}/storage/v1/object/public/recipe-images/${slug}.jpg?v=${stamp}` }) });
    console.log(`published ${slug}`);
  }
  console.log("Done. Reload the app to see the photos.");
}

(flag("publish") ? publish() : drafts()).catch((e) => { console.error(e.message ?? e); process.exit(1); });
