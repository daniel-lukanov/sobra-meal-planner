// Continente scraper + importer for the Sobra database. Run with Bun:
//   bun db/scripts/continente.ts                       dry run: fetch, parse, print a summary (writes nothing)
//   bun db/scripts/continente.ts --query arroz --pages 1
//   bun db/scripts/continente.ts --write               also save to the database (needs db/.env)
//   bun db/scripts/continente.ts --from-file data/raw/continente/grid_arroz.html --query arroz   parse a saved page
// Slow and small on purpose (see db/METHODOLOGY.md): one request every ~2 s, a few pages per ingredient.
// Educational prototype use. The secret key stays in db/.env and is never printed.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

// ---------- what to search for, and how a result maps to one of our ingredients ----------
type Rule = { query: string; ingredient: string; include: RegExp; exclude?: RegExp; byName?: [RegExp, string][] };
const RULES: Rule[] = [
  { query: "batata", ingredient: "potatoes", include: /^batata/i, exclude: /(frita|palha|chips|doce|snack|pur[eé]|gnocchi|croquete)/i },
  { query: "cebola", ingredient: "onion", include: /^cebola/i, exclude: /(frita|em p[oó]|pickle|conserva|crocante)/i },
  { query: "cenoura", ingredient: "carrots", include: /^cenoura/i, exclude: /(sumo|bolo|puré)/i },
  { query: "ovos", ingredient: "eggs", include: /^ovos/i, exclude: /(chocolate|p[aá]scoa|codorniz)/i },
  { query: "arroz", ingredient: "rice", include: /^arroz/i, exclude: /(leite|bolacha|tosta|massa|doce|snack|bebida|farinha|cake)/i },
  { query: "grão de bico", ingredient: "chickpeas", include: /^gr[ãa]o/i, exclude: /(farinha|snack|húmus|hummus)/i },
  { query: "pimento", ingredient: "peppers", include: /^pimento/i, exclude: /(piri|mo[ií]do|colorau|doce em p[oó])/i },
  { query: "atum", ingredient: "tuna", include: /^atum/i, exclude: /(pat[eé]|salada|gato|cão)/i },
  { query: "espinafre", ingredient: "spinach", include: /^espinafre/i },
  { query: "frango", ingredient: "chicken", include: /^(frango|peito de frango|coxa|sobrecoxa|perna|asa)/i, exclude: /(pat[eé]|nugget|panado|fiambre|salsicha|sopa|cão|gato|ração)/i,
    byName: [[/peito/i, "chicken-breast"], [/sobrecoxa|coxa/i, "chicken-thighs"]] },
  { query: "esparguete", ingredient: "spaghetti", include: /^esparguete/i },
  { query: "leite de coco", ingredient: "coconut-milk", include: /^leite de coco/i },
  { query: "limão", ingredient: "lemon", include: /^lim[ãa]o/i, exclude: /(sumo|bebida|ch[aá])/i },
  { query: "molho de soja", ingredient: "soy-sauce", include: /^molho de soja/i },
  { query: "azeite", ingredient: "olive-oil", include: /^azeite/i, exclude: /(spray|sabor|aromatizado)/i },
];

// ---------- parsing ----------
const ENT: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", apos: "'", euro: "€", nbsp: " ",
  atilde: "ã", otilde: "õ", ccedil: "ç", eacute: "é", egrave: "è", ecirc: "ê", aacute: "á", agrave: "à", acirc: "â",
  iacute: "í", oacute: "ó", ocirc: "ô", uacute: "ú", Atilde: "Ã", Ccedil: "Ç", Eacute: "É", Aacute: "Á", Iacute: "Í", Oacute: "Ó", Uacute: "Ú" };
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&([A-Za-z]+);/g, (m, n) => ENT[n] ?? m);
const text = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const num = (s: string) => parseFloat(s.replace(/[^\d,.]/g, "").replace(",", "."));

export type Parsed = { id: string; name: string; brand: string | null; category: string | null; url: string | null;
  price: number; was: number | null; packQty: number; packUnit: "g" | "ml" | "piece"; qtyText: string };

export function parseQuantity(raw: string): { qty: number; unit: "g" | "ml" | "piece" } | null {
  const s = raw.toLowerCase().replace(/\(aprox\.?\)/g, "").replace(/emb\.?/g, "").trim();
  const unitOf = (u: string, v: number) => {
    if (u === "kg") return { qty: v * 1000, unit: "g" as const };
    if (u === "g" || u === "gr") return { qty: v, unit: "g" as const };
    if (u === "l" || u === "lt") return { qty: v * 1000, unit: "ml" as const };
    if (u === "cl") return { qty: v * 10, unit: "ml" as const };
    if (u === "ml") return { qty: v, unit: "ml" as const };
    if (u === "un" || u === "unid" || u === "uni") return { qty: v, unit: "piece" as const };
    return null;
  };
  const multi = s.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|l|cl|ml|un)\b/);
  if (multi) { const u = unitOf(multi[3], num(multi[2]) * +multi[1]); if (u) return u; }
  const one = s.match(/(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|l|cl|ml|unid|uni|un)\b/);
  if (one) return unitOf(one[2], num(one[1]));
  return null;
}

export function parseGrid(html: string): { items: Parsed[]; skipped: string[]; total: number | null } {
  const items: Parsed[] = []; const skipped: string[] = [];
  const total = html.match(/data-total-count="(\d+)"/)?.[1];
  for (const t of html.split('<div class="product" data-pid="').slice(1)) {
    const id = t.slice(0, t.indexOf('"'));
    try {
      const imp = JSON.parse(decode(t.match(/data-product-tile-impression='([^']*)'/)?.[1] ?? "{}"));
      const name = text(t.match(/pwc-tile--description[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? imp.name ?? "");
      const primary = t.match(/pwc-tile--price-primary">([\s\S]*?)<\/span>\s*<\/span>/)?.[1];
      const primaryText = primary ? text(primary) : "";
      let price = primary ? num(primaryText) : Number(imp.price);
      let was = (() => { const w = t.match(/strike-through[\s\S]*?pwc-tile--price-value"[^>]*>([\s\S]*?)<\/span>/)?.[1]; return w ? num(text(w)) : null; })();
      const qtyText = text(t.match(/pwc-tile--quantity">([\s\S]*?)<\/p>/)?.[1] ?? "");
      const q = parseQuantity(qtyText);
      // Items sold by weight show the price per kg (or per litre) as the big price. Store the price of the whole pack:
      // the small "€/un" figure under it is the pack price; if it is missing, scale by the pack size.
      if (/\/(kg|lt|l)\b/i.test(primaryText) && isFinite(price)) {
        const sec = text(t.match(/pwc-tile--price-secondary[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
        const packPrice = /\/un\b/i.test(sec) ? num(sec) : q ? Math.round(price * (q.qty / 1000) * 100) / 100 : NaN;
        if (!isFinite(packPrice)) { skipped.push(`${id} ${name} [per-kg price, no pack price]`); continue; }
        if (was) was = Math.round(was * (packPrice / price) * 100) / 100;
        price = packPrice;
      }
      if (!name || !isFinite(price) || !q) { skipped.push(`${id} ${name} [${qtyText}]`); continue; }
      items.push({ id, name, brand: imp.brand ? decode(String(imp.brand)) : null, category: imp.category ?? null,
        url: t.match(/href="(https:\/\/www\.continente\.pt\/produto\/[^"]+)"/)?.[1] ?? null,
        price, was, packQty: q.qty, packUnit: q.unit, qtyText });
    } catch { skipped.push(`${id} (parse error)`); }
  }
  return { items, skipped, total: total ? +total : null };
}

export function mapToIngredient(rule: Rule, name: string): string | null {
  if (!rule.include.test(name) || (rule.exclude && rule.exclude.test(name))) return null;
  for (const [re, slug] of rule.byName ?? []) if (re.test(name)) return slug;
  return rule.ingredient;
}

// ---------- fetching ----------
const BASE = "https://www.continente.pt/on/demandware.store/Sites-continente-Site/default/Search-UpdateGrid";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function fetchGrid(q: string, start: number): Promise<string> {
  const res = await fetch(`${BASE}?q=${encodeURIComponent(q)}&start=${start}&sz=24`, { headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for "${q}" start=${start}`);
  return res.text();
}

// ---------- database (Supabase REST, secret key from db/.env, batches) ----------
function loadEnv(): { url: string; key: string } {
  const f = new URL("../.env", import.meta.url).pathname;
  if (!existsSync(f)) throw new Error("db/.env not found. Create it first (see the setup command).");
  const env: Record<string, string> = {};
  for (const line of readFileSync(f, "utf8").split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("db/.env needs SUPABASE_URL and SUPABASE_SECRET_KEY");
  return { url: env.SUPABASE_URL.replace(/\/+$/, ""), key: env.SUPABASE_SECRET_KEY };
}
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const lisbonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

async function rest(env: { url: string; key: string }, path: string, init: RequestInit & { prefer?: string } = {}) {
  const res = await fetch(`${env.url}/rest/v1/${path}`, { ...init, headers: { apikey: env.key, "Content-Type": "application/json",
    ...(init.prefer ? { Prefer: init.prefer } : {}), ...(init.headers as object) } });
  if (!res.ok) throw new Error(`DB ${res.status} on ${path.split("?")[0]}: ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

type Row = Parsed & { ingredientSlug: string };

async function save(rows: Row[], holdDays: number) {
  const env = loadEnv(); const today = lisbonToday();
  const ing: { id: string; slug: string }[] = await rest(env, "ingredient?select=id,slug");
  const idOf = new Map(ing.map((i) => [i.slug, i.id]));

  // 1) products (upsert on chain + external id)
  const prodRows = rows.map((r) => ({ chain_id: "continente", external_id: r.id, name: r.name, brand: r.brand, pack_qty: r.packQty,
    pack_unit: r.packUnit, url: r.url, ingredient_id: idOf.get(r.ingredientSlug) ?? null, mapping_source: "rule", active: true }));
  const pid = new Map<string, string>();
  for (const b of chunk(prodRows, 200)) {
    const out: { id: string; external_id: string }[] = await rest(env, "product?on_conflict=chain_id,external_id&select=id,external_id",
      { method: "POST", body: JSON.stringify(b), prefer: "resolution=merge-duplicates,return=representation" });
    for (const o of out) pid.set(o.external_id, o.id);
  }

  // 2) regular price: new row only when it changed
  const ids = [...pid.values()]; const cur = new Map<string, { id: string; price: number }>();
  for (const b of chunk(ids, 100)) {
    const out: { id: string; product_id: string; price: number }[] = await rest(env, `product_price?select=id,product_id,price&valid_to=is.null&product_id=in.(${b.join(",")})`);
    for (const o of out) cur.set(o.product_id, { id: o.id, price: Number(o.price) });
  }
  const newPrices: object[] = []; let changed = 0;
  for (const r of rows) {
    const p = pid.get(r.id); if (!p) continue;
    const regular = r.was ?? r.price; const c = cur.get(p);
    if (c && Math.abs(c.price - regular) < 0.005) continue;
    if (c) { await rest(env, `product_price?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ valid_to: addDays(today, -1) }) }); changed++; }
    newPrices.push({ product_id: p, price: regular, valid_from: today, source: "online" });
  }
  for (const b of chunk(newPrices, 200)) await rest(env, "product_price", { method: "POST", body: JSON.stringify(b) });

  // 3) promotions: strike-through "was" price. The tile has no end date, so the window runs to today + holdDays
  //    (assumed to hold until the next refresh) and is extended each time the same promo is seen again.
  const promos = rows.filter((r) => r.was && r.was > r.price); let promoNew = 0, promoExt = 0;
  const existing = new Map<string, { id: string; promo_price: number; promotion_window: { id: string; ends_on: string }[] }[]>();
  for (const b of chunk(promos.map((r) => pid.get(r.id)!), 100)) {
    const out = await rest(env, `promotion?select=id,product_id,promo_price,promotion_window(id,ends_on)&source=eq.online&product_id=in.(${b.join(",")})`);
    for (const o of out as any[]) (existing.get(o.product_id) ?? existing.set(o.product_id, []).get(o.product_id)!).push(o);
  }
  for (const r of promos) {
    const p = pid.get(r.id)!; const end = addDays(today, holdDays);
    const hit = (existing.get(p) ?? []).find((e) => Math.abs(Number(e.promo_price) - r.price) < 0.005 && e.promotion_window.some((w) => w.ends_on >= addDays(today, -1)));
    if (hit) { const w = hit.promotion_window.reduce((a, b) => (a.ends_on > b.ends_on ? a : b)); await rest(env, `promotion_window?id=eq.${w.id}`, { method: "PATCH", body: JSON.stringify({ ends_on: end }) }); promoExt++; continue; }
    const [pr]: { id: string }[] = await rest(env, "promotion?select=id", { method: "POST", prefer: "return=representation",
      body: JSON.stringify([{ product_id: p, promo_price: r.price, regular_price: r.was, deal_type: "price_cut", source: "online", source_url: r.url }]) });
    await rest(env, "promotion_window", { method: "POST", body: JSON.stringify([{ promotion_id: pr.id, starts_on: today, ends_on: end }]) });
    promoNew++;
  }
  return { products: prodRows.length, pricesChanged: newPrices.length, closedOld: changed, promoNew, promoExtended: promoExt };
}

// ---------- main ----------
async function main() {
  const a = process.argv.slice(2); const flag = (n: string) => a.includes(`--${n}`); const val = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const pages = +(val("pages") ?? 1); const only = val("query"); const file = val("from-file"); const hold = +(val("hold-days") ?? 3);
  const rules = RULES.filter((r) => !only || r.query === only);
  if (!rules.length) throw new Error(`No rule for query "${only}". Known: ${RULES.map((r) => r.query).join(", ")}`);
  mkdirSync("data/raw/continente", { recursive: true });
  const rows: Row[] = []; const seen = new Set<string>();
  for (const rule of rules) {
    let kept = 0, dropped = 0, total: number | null = null;
    for (let p = 0; p < pages; p++) {
      const html = file ? readFileSync(file, "utf8") : await fetchGrid(rule.query, p * 24);
      if (!file) writeFileSync(`data/raw/continente/${rule.query.replace(/\W+/g, "_")}_p${p}.html`, html);
      const g = parseGrid(html); total = g.total;
      for (const it of g.items) {
        const slug = mapToIngredient(rule, it.name);
        if (!slug) { dropped++; continue; }
        if (seen.has(it.id)) continue; seen.add(it.id); kept++; rows.push({ ...it, ingredientSlug: slug });
      }
      if (g.skipped.length) console.log(`  skipped ${g.skipped.length} (no pack size or price): ${g.skipped.slice(0, 3).join(" | ")}`);
      if (file || (p + 1) * 24 >= (total ?? 0)) break;
      await sleep(2000);
    }
    console.log(`${rule.query.padEnd(14)} -> ${rule.ingredient.padEnd(12)} kept ${kept}, not matched ${dropped}, shop has ${total ?? "?"} results`);
    if (!file) await sleep(2000);
  }
  const promo = rows.filter((r) => r.was && r.was > r.price);
  console.log(`\n${rows.length} products, ${promo.length} with a strike-through "was" price.`);
  for (const r of rows.slice(0, 8)) console.log(`  ${r.ingredientSlug.padEnd(14)} ${r.name.slice(0, 38).padEnd(38)} ${r.packQty}${r.packUnit === "piece" ? " pc" : " " + r.packUnit}  €${r.price.toFixed(2)}${r.was ? `  (was €${r.was.toFixed(2)})` : ""}`);
  if (!flag("write")) { console.log("\nDry run: nothing was saved. Add --write to save to the database."); return; }
  console.log("\nSaving…", JSON.stringify(await save(rows, hold)));
}
if (import.meta.main) main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
