// USDA FoodKeeper (CC0): load the raw data, then approve shelf-life numbers for our ingredients by hand.
//   bun db/scripts/foodkeeper.ts load [--file path/to/foodkeeper.json]   download (or read) the data and save it to foodkeeper_item
//   bun db/scripts/foodkeeper.ts review                                  per ingredient: pick the matching FoodKeeper item, approve the numbers
//   bun db/scripts/foodkeeper.ts status                                  which ingredients have approved shelf life
// Rules (db/METHODOLOGY.md): numbers come from FoodKeeper and nowhere else, a person approves each one, and when unsure the ingredient is skipped.
// The secret key stays in db/.env and is never printed.

import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const SOURCE_URL = "https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json";

// ---------- parsing (pure, tested in src/test/foodkeeper.test.ts) ----------
export type FkItem = { id: number; name: string; category: string | null; keywords: string | null; raw: Record<string, unknown> };
export type Span = { min: number; max: number } | null;

/** One row of the published JSON is a list of one-key objects; make it one flat object. */
const flat = (row: unknown): Record<string, unknown> =>
  Array.isArray(row) ? Object.assign({}, ...row.filter((x) => x && typeof x === "object")) : (row as Record<string, unknown>);

export function parseFoodKeeper(json: unknown): FkItem[] {
  const sheets = ((json as { sheets?: { name: string; data: unknown[] }[] }).sheets ?? []);
  const rows = (name: string) => (sheets.find((s) => s.name === name)?.data ?? []).map(flat);
  const categories = new Map(rows("Category").map((r) => [Number(r["Category_ID"] ?? r["ID"]), String(r["Category_Name"] ?? r["Name"] ?? "")]));
  return rows("Product").flatMap((r) => {
    const id = Number(r["ID"] ?? r["Product_ID"]);
    const name = [r["Name"], r["Name_subtitle"]].filter((x) => typeof x === "string" && x.trim()).join(", ");
    if (!Number.isFinite(id) || !name) return [];
    return [{ id, name, category: categories.get(Number(r["Category_ID"])) ?? null, keywords: typeof r["Keywords"] === "string" ? r["Keywords"] : null, raw: r }];
  });
}

const UNIT_DAYS: Record<string, number> = { days: 1, day: 1, weeks: 7, week: 7, months: 30, month: 30, years: 365, year: 365 };
/** A FoodKeeper range in whole days. "Indefinitely", "When Ripe" and "Not Recommended" have no day count, so they return null. */
export function toDays(min: unknown, max: unknown, metric: unknown): Span {
  const unit = UNIT_DAYS[String(metric ?? "").trim().toLowerCase()];
  const lo = Number(min), hi = Number(max ?? min);
  if (!unit || !Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0) return null;
  return { min: Math.max(1, Math.round(lo * unit)), max: Math.max(1, Math.round(Math.max(lo, hi) * unit)) };
}

export const LOCATIONS = [
  { location: "pantry", prefix: "Pantry" },
  { location: "fridge", prefix: "Refrigerate" },
] as const;
/** Days kept from the date of purchase (the DOP_ columns, which most fresh foods use), else the plain column (package or "use by" date). */
export const spanOf = (item: FkItem, prefix: string): Span => {
  const at = (p: string) => toDays(item.raw[`${p}_Min`], item.raw[`${p}_Max`], item.raw[`${p}_Metric`]);
  return at(`DOP_${prefix}`) ?? at(prefix);
};

// What to look for per ingredient. Only a suggestion for the person reviewing: nothing is saved without a choice.
export const TERMS: Record<string, { match: RegExp; avoid?: RegExp }> = {
  potatoes: { match: /\bpotatoes?\b/i, avoid: /(sweet|chip|salad|frozen|mashed|dehydrated|french|casserole|dough|instant)/i },
  chicken: { match: /\bchicken\b/i, avoid: /(nugget|salad|soup|canned|broth|cooked|leftover|dinner|pie|fried|stuffed)/i },
  onion: { match: /\bonions?\b/i, avoid: /(green|dip|dried|powder|rings|soup)/i },
  carrots: { match: /\bcarrots?\b/i, avoid: /(cake|juice|baby food)/i },
  eggs: { match: /\beggs?\b/i, avoid: /(salad|substitute|nog|hard|cooked|pasteurized|dried)/i },
  rice: { match: /\brice\b/i, avoid: /(cooked|pudding|cake|wild|mix|cereal)/i },
  chickpeas: { match: /(chickpea|garbanzo)/i },
  peppers: { match: /\b(bell )?peppers?\b/i, avoid: /(hot|chili|cayenne|black|ground|sauce|stuffed|jalape)/i },
  tuna: { match: /\btuna\b/i, avoid: /(salad|fresh|steak)/i },
  spinach: { match: /\bspinach\b/i, avoid: /(frozen|dip|canned)/i },
  spaghetti: { match: /(\bpasta\b|spaghetti)/i, avoid: /(fresh|cooked|sauce|salad|filled|refrigerated)/i },
  "coconut-milk": { match: /coconut/i },
  lemon: { match: /\blemons?\b/i, avoid: /(juice|bottled|pie)/i },
  "soy-sauce": { match: /\bsoy\b/i, avoid: /(milk|beans?|nuts?|bean)/i },
  "olive-oil": { match: /\bolive\b/i, avoid: /(olives?\b.*(jar|stuffed))/i },
};

/** Suggested FoodKeeper items for one ingredient, best first: shorter names (closer to the plain product) before longer ones. */
export function candidates(items: FkItem[], slug: string, max = 6): FkItem[] {
  const t = TERMS[slug];
  if (!t) return [];
  const hay = (i: FkItem) => `${i.name} ${i.category ?? ""}`;
  return items
    .filter((i) => t.match.test(i.name) && !(t.avoid?.test(hay(i))) && LOCATIONS.some((l) => spanOf(i, l.prefix)))
    .sort((a, b) => a.name.length - b.name.length)
    .slice(0, max);
}

// ---------- database (Supabase REST, secret key from db/.env) ----------
function loadEnv(): { url: string; key: string } {
  const f = new URL("../.env", import.meta.url).pathname;
  if (!existsSync(f)) throw new Error("db/.env not found.");
  const env: Record<string, string> = {};
  for (const line of readFileSync(f, "utf8").split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]!] = m[2]!.trim(); }
  if (!env["SUPABASE_URL"] || !env["SUPABASE_SECRET_KEY"]) throw new Error("db/.env needs SUPABASE_URL and SUPABASE_SECRET_KEY");
  return { url: env["SUPABASE_URL"].replace(/\/+$/, ""), key: env["SUPABASE_SECRET_KEY"] };
}
async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const env = loadEnv();
  const res = await fetch(`${env.url}/rest/v1/${path}`, { ...init, headers: { apikey: env.key, "Content-Type": "application/json", ...(init.prefer ? { Prefer: init.prefer } : {}) } });
  if (!res.ok) throw new Error(`DB ${res.status} on ${path.split("?")[0]}: ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function download(): Promise<string> {
  const urls = [SOURCE_URL, "http://www.fsis.usda.gov/shared/data/EN/foodkeeper.json"];
  let last = "";
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; sobra-prototype)", Accept: "application/json,*/*" } });
      const body = await res.text();
      if (body.trimStart().startsWith("{")) return body;
      last = `${url} answered ${res.status} with a web page instead of JSON: ${body.trimStart().slice(0, 120).replace(/\s+/g, " ")}`;
    } catch (e) { last = `${url}: ${String((e as Error).message)}`; }
  }
  throw new Error(`Could not download the data. ${last}\nOpen ${SOURCE_URL} in your browser, save the page as foodkeeper.json (Cmd+S), then run: bun db/scripts/foodkeeper.ts load --file ~/Downloads/foodkeeper.json`);
}

async function load(file?: string) {
  const text = file ? readFileSync(file.replace(/^~(?=\/)/, process.env["HOME"] ?? "~"), "utf8") : await download();
  if (!text.trimStart().startsWith("{")) throw new Error("That file is not JSON. It looks like a web page. Save the raw JSON file instead.");
  const items = parseFoodKeeper(JSON.parse(text));
  if (!items.length) throw new Error("No products found in the file. Is it the English foodkeeper.json?");
  for (const part of chunk(items, 200)) {
    await rest("foodkeeper_item?on_conflict=id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify(part.map((i) => ({ id: i.id, name: i.name, category: i.category, keywords: i.keywords, raw: i.raw }))) });
  }
  console.log(`Saved ${items.length} FoodKeeper products.`);
}

const fmt = (s: Span) => (s ? (s.min === s.max ? `${s.min} days` : `${s.min} to ${s.max} days`) : "no figure");

async function review() {
  const ings: { id: string; slug: string; name: string }[] = await rest("ingredient?select=id,slug,name&order=slug");
  const have: { ingredient_id: string }[] = await rest("storage_guideline?select=ingredient_id&review_status=eq.approved");
  const done = new Set(have.map((h) => h.ingredient_id));
  const rows: { id: number; name: string; category: string | null; keywords: string | null; raw: Record<string, unknown> }[] = await rest("foodkeeper_item?select=id,name,category,keywords,raw&limit=2000");
  if (!rows.length) throw new Error("foodkeeper_item is empty. Run the load command first.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const who = (await rl.question("Your name for the review record: ")).trim() || "reviewer";
  for (const ing of ings) {
    if (done.has(ing.id) || !TERMS[ing.slug]) continue;
    const list = candidates(rows, ing.slug);
    console.log(`\n=== ${ing.name} (${ing.slug}) ===`);
    if (!list.length) { console.log("No suggestions. Skipped."); continue; }
    list.forEach((c, n) => console.log(` ${n + 1}. ${c.name}  [${c.category ?? "-"}]   pantry: ${fmt(spanOf(c, "Pantry"))}   fridge: ${fmt(spanOf(c, "Refrigerate"))}`));
    const pick = (await rl.question("Number to approve, or Enter to skip: ")).trim();
    const chosen = list[Number(pick) - 1];
    if (!chosen) { console.log("Skipped."); continue; }
    for (const l of LOCATIONS) {
      const span = spanOf(chosen, l.prefix);
      if (!span) continue;
      const ok = (await rl.question(`  Approve ${l.location}: ${fmt(span)} for raw ${ing.name}? [y/N] `)).trim().toLowerCase() === "y";
      if (!ok) continue;
      await rest("storage_guideline?on_conflict=ingredient_id,state,location", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify([{
        ingredient_id: ing.id, state: "raw", location: l.location, min_days: span.min, max_days: span.max, source: "foodkeeper", foodkeeper_item_id: chosen.id,
        note: chosen.name, review_status: "approved", reviewed_by: who, reviewed_at: new Date().toISOString(),
      }]) });
      console.log("  Saved.");
    }
  }
  rl.close();
}

async function status() {
  const rows: { location: string; min_days: number; max_days: number; ingredient: { slug: string } | null }[] =
    await rest("storage_guideline?select=location,min_days,max_days,ingredient(slug)&review_status=eq.approved&order=ingredient_id");
  if (!rows.length) { console.log("No approved shelf life yet."); return; }
  for (const r of rows) console.log(`${(r.ingredient?.slug ?? "?").padEnd(14)} ${r.location.padEnd(7)} ${r.min_days} to ${r.max_days} days`);
}

if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);
  const fi = args.indexOf("--file");
  const run = cmd === "load" ? load(fi >= 0 ? args[fi + 1] : undefined) : cmd === "review" ? review() : cmd === "status" ? status() : null;
  if (!run) { console.log("Usage: bun db/scripts/foodkeeper.ts load|review|status [--file path]"); process.exit(1); }
  run.catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
}
