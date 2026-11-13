// Continente scraper + importer for the Sobra database. Run with Bun:
//   bun db/scripts/continente.ts                       dry run: fetch, parse, print a summary (writes nothing)
//   bun db/scripts/continente.ts --query arroz --pages 1
//   bun db/scripts/continente.ts --write               also save to the database (needs db/.env)
//   bun db/scripts/continente.ts --from-file data/raw/continente/grid_arroz.html --query arroz   parse a saved page
// Slow and small on purpose (see db/METHODOLOGY.md): one request every ~2 s, a few pages per ingredient.
// Educational prototype use. The secret key stays in db/.env and is never printed.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

// ---------- what to search for, and how a result maps to one of our ingredients ----------
// category: the shop's own category path (from each tile) must match. This is the main precision filter; include/exclude on the
// name is a second check. usable: share of the pack weight that is usable (first matching regex wins; no match = whole pack).
type Rule = { query: string; ingredient: string; category: RegExp; include: RegExp; exclude?: RegExp; byName?: [RegExp, string][]; usable?: [RegExp, number][] };
export const RULES: Rule[] = [
  { query: "batata", ingredient: "potatoes", category: /Frutas e Legumes\/Legumes\/Batata$/, include: /^batata/i, exclude: /(doce|airfryer|palitos|gomos|cubos|congelad)/i },
  { query: "cebola", ingredient: "onion", category: /Frutas e Legumes\/Legumes\/Cebola e Alho$/, include: /^cebola/i, exclude: /(picada|laminada|frasco|chalota)/i },
  { query: "cenoura", ingredient: "carrots", category: /Frutas e Legumes\/Legumes(\/Cenoura e Abóbora)?$/, include: /^cenoura/i, exclude: /(ripad|palitos|preparado|creme|sopa|juliana)/i },
  { query: "ovos", ingredient: "eggs", category: /Laticínios e Ovos\/Ovos$/, include: /^ovos/i, exclude: /(pasteurizados|l[ií]quid|cozidos|codorniz)/i },
  { query: "arroz", ingredient: "rice", category: /Arroz, Massa e Farinha\/Arroz$/, include: /^arroz/i, exclude: /\bdoce\b/i }, // "arroz doce" is rice-pudding rice
  // canned (cooked) chickpeas only: dried ones sit under "Leguminosas" and recipes count cooked chickpeas.
  // The tile weight may already be the drained weight: usable share left at 1 until checked on a label.
  { query: "grão de bico", ingredient: "chickpeas", category: /Conservas\/Feijão e Grão de Bico$/, include: /^gr[ãa]o de bico/i, exclude: /(estilo|tagine)/i },
  { query: "pimento", ingredient: "peppers", category: /Frutas e Legumes\/Legumes\/Pepino e Pimento$/, include: /^pimento/i, exclude: /(assad|tiras|piquillo|jalape|fatiado|misto|conserva|frasco)/i },
  { query: "atum", ingredient: "tuna", category: /Conservas\/Atum$/, include: /^(filetes? de |ventresca de |lombos? de )?atum/i, exclude: /(pat[eé]|salada|hamb[uú]rguer|escabeche|malagueta|alcaparras|manjeric|couscous)/i, usable: [[/./, 0.7]] }, // label weight includes oil/brine
  { query: "espinafre", ingredient: "spinach", category: /(Frutas e Legumes\/Legumes\/Espinafres|Congelados\/Frutas e Legumes\/Legumes)$/, include: /^espinafre/i, exclude: /(preparado|esparregado|creme)/i },
  { query: "frango", ingredient: "chicken", category: /Talho\/Frango$/, include: /^(frango|metades? de frango|peito|bifes? de frango|lombinhos? de frango|coxas?|sobrecoxas?|perna|perninhas?|asas?|asinhas?)/i,
    exclude: /(moelas|f[ií]gado|pescoço|strogonoff|almôndega|hambúrguer|miúdos de|\basas?\b|asinhas)/i,
    byName: [[/peito/i, "chicken-breast"], [/sobrecoxa|coxa/i, "chicken-thighs"]],
    usable: [[/(peito|bifes?|lombinhos?)/i, 1], [/./, 0.65]] }, // bone-in cuts: roughly 65% edible (placeholder)
  { query: "esparguete", ingredient: "spaghetti", category: /Arroz, Massa e Farinha\/Massa$/, include: /^(massa )?esparguete/i, exclude: /(shirataki|konjac|com ovo|noodle)/i },
  { query: "leite de coco", ingredient: "coconut-milk", category: /Leite Condensado e Leite de Coco$/, include: /^leite de coco/i, exclude: /(condensado|creme de)/i },
  { query: "limão", ingredient: "lemon", category: /Frutas\/Limão e Lima$/, include: /^lim[ãa]o/i },
  { query: "molho de soja", ingredient: "soy-sauce", category: /Molhos, Temperos e Sal\/Molhos$/, include: /^molho de soja/i, exclude: /(ponzu|yakitori|tempura|teriyaki)/i },
  { query: "azeite", ingredient: "olive-oil", category: /Azeite, Óleo e Vinagre\/Azeite$/, include: /^azeite/i, exclude: /(spray|sabor|aromatizado)/i },
];

// Unit each ingredient is priced in (matches ingredient.base_unit in the database). grams_per_piece lets a product sold by
// weight be priced per piece (lemon, eggs). Liquids sold by weight are treated as 1 g = 1 ml (a rough, flagged simplification).
const BASE_UNITS: Record<string, { unit: "g" | "ml" | "piece"; gpp?: number }> = {
  eggs: { unit: "piece", gpp: 60 }, lemon: { unit: "piece", gpp: 100 },
  "coconut-milk": { unit: "ml" }, "soy-sauce": { unit: "ml" }, "olive-oil": { unit: "ml" },
};
export function fitUnit(slug: string, qty: number, unit: "g" | "ml" | "piece"): { qty: number; unit: "g" | "ml" | "piece" } | null {
  const b = BASE_UNITS[slug] ?? { unit: "g" as const };
  if (unit === b.unit) return { qty, unit };
  if (b.unit === "piece" && unit === "g" && b.gpp) return { qty: Math.round((qty / b.gpp) * 100) / 100, unit: "piece" };
  if ((b.unit === "ml" && unit === "g") || (b.unit === "g" && unit === "ml")) return { qty, unit: b.unit };
  return null;
}


// ---------- parsing ----------
const ENT: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", apos: "'", euro: "€", nbsp: " ",
  atilde: "ã", otilde: "õ", ccedil: "ç", eacute: "é", egrave: "è", ecirc: "ê", aacute: "á", agrave: "à", acirc: "â",
  iacute: "í", oacute: "ó", ocirc: "ô", uacute: "ú", ordm: "º", ordf: "ª", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", reg: "®", trade: "™", copy: "©", ntilde: "ñ", uuml: "ü", ouml: "ö", auml: "ä", szlig: "ß", Atilde: "Ã", Ccedil: "Ç", Eacute: "É", Aacute: "Á", Iacute: "Í", Oacute: "Ó", Uacute: "Ú" };
export const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&([A-Za-z]+);/g, (m, n) => ENT[n] ?? m);
export const text = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
export const num = (s: string) => parseFloat(s.replace(/[^\d,.]/g, "").replace(",", "."));

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
      // Items sold by weight show the price per kg (or litre) as the big price. Store the price of one pack:
      //  - fixed packs ("emb. 1,2 kg (aprox.)"): per-kg price x pack weight
      //  - loose produce ("Quant. Minima = 600 gr (4 un)"): there is no pack, so price one kg (the small "EUR/un" figure is
      //    the price of a single piece, not of a pack)
      let qFinal = q;
      if (/\/(kg|lt|l)\b/i.test(primaryText) && isFinite(price)) {
        const loose = /m[ií]nima|min\./i.test(qtyText) || !q;
        const unitIsLitre = /\/(lt|l)\b/i.test(primaryText);
        const factor = loose ? 1 : q!.qty / 1000;
        if (loose) qFinal = { qty: 1000, unit: unitIsLitre ? "ml" : "g" };
        if (was) was = Math.round(was * factor * 100) / 100;
        price = Math.round(price * factor * 100) / 100;
      }
      if (!name || !isFinite(price) || !qFinal) { skipped.push(`${id} ${name} [${qtyText}]`); continue; }
      items.push({ id, name, brand: imp.brand ? decode(String(imp.brand)) : null, category: imp.category ?? null,
        url: t.match(/href="(https:\/\/www\.continente\.pt\/produto\/[^"]+)"/)?.[1] ?? null,
        price, was, packQty: qFinal.qty, packUnit: qFinal.unit, qtyText });
    } catch { skipped.push(`${id} (parse error)`); }
  }
  return { items, skipped, total: total ? +total : null };
}

export function mapToIngredient(rule: Rule, name: string, category: string | null): string | null {
  if (!category || !rule.category.test(category)) return null;
  if (!rule.include.test(name) || (rule.exclude && rule.exclude.test(name))) return null;
  for (const [re, slug] of rule.byName ?? []) if (re.test(name)) return slug;
  return rule.ingredient;
}

export function usableFraction(rule: Rule, name: string): number | null {
  for (const [re, f] of rule.usable ?? []) if (re.test(name)) return f < 1 ? f : null;
  return null;
}

// ---------- fetching ----------
const BASE = "https://www.continente.pt/on/demandware.store/Sites-continente-Site/default/Search-UpdateGrid";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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

export type Row = Parsed & { ingredientSlug: string; usableQty: number | null };

// chain: the shop the rows come from (shared with the other scrapers)
export async function save(rows: Row[], holdDays: number, touchedSlugs: string[], chain = "continente") {
  const env = loadEnv(); const today = lisbonToday();
  const ing: { id: string; slug: string }[] = await rest(env, "ingredient?select=id,slug");
  const idOf = new Map(ing.map((i) => [i.slug, i.id]));

  // 1) products (upsert on chain + external id)
  // usable weights set from a label or by hand are never overwritten by rule values
  const kept = new Map<string, { usable_qty: number; usable_source: string }>();
  for (const b of chunk(rows.map((r) => r.id), 100)) {
    const out: { external_id: string; usable_qty: number; usable_source: string }[] = await rest(env, `product?select=external_id,usable_qty,usable_source&chain_id=eq.${chain}&usable_source=in.(label,manual)&external_id=in.(${b.join(",")})`);
    for (const o of out) kept.set(o.external_id, o);
  }
  const prodRows = rows.map((r) => ({ chain_id: chain, external_id: r.id, name: r.name, brand: r.brand, pack_qty: r.packQty,
    pack_unit: r.packUnit, url: r.url, ingredient_id: idOf.get(r.ingredientSlug) ?? null, mapping_source: "rule", active: true,
    usable_qty: kept.get(r.id)?.usable_qty ?? r.usableQty, usable_source: kept.get(r.id)?.usable_source ?? (r.usableQty ? "rule" : null) }));
  const pid = new Map<string, string>();
  for (const b of chunk(prodRows, 200)) {
    const out: { id: string; external_id: string }[] = await rest(env, "product?on_conflict=chain_id,external_id&select=id,external_id",
      { method: "POST", body: JSON.stringify(b), prefer: "resolution=merge-duplicates,return=representation" });
    for (const o of out) pid.set(o.external_id, o.id);
  }

  // 1b) products this run no longer matches (rules changed, or the shop dropped them): unlink and deactivate
  const touchedIds = touchedSlugs.map((x) => idOf.get(x)).filter(Boolean) as string[];
  const old: { id: string; external_id: string }[] = await rest(env, `product?select=id,external_id&chain_id=eq.${chain}&mapping_source=eq.rule&ingredient_id=in.(${touchedIds.join(",")})`);
  const stale = old.filter((o) => !pid.has(o.external_id)).map((o) => o.id);
  for (const b of chunk(stale, 100)) await rest(env, `product?id=in.(${b.join(",")})`, { method: "PATCH", body: JSON.stringify({ ingredient_id: null, active: false }) });

  // 2) regular price: new row only when it changed
  const ids = [...pid.values()]; const cur = new Map<string, { id: string; price: number; valid_from: string }>();
  for (const b of chunk(ids, 100)) {
    const out: { id: string; product_id: string; price: number; valid_from: string }[] = await rest(env, `product_price?select=id,product_id,price,valid_from&valid_to=is.null&product_id=in.(${b.join(",")})`);
    for (const o of out) cur.set(o.product_id, { id: o.id, price: Number(o.price), valid_from: o.valid_from });
  }
  const newPrices: object[] = []; let changed = 0;
  for (const r of rows) {
    const p = pid.get(r.id); if (!p) continue;
    const regular = r.was ?? r.price; const c = cur.get(p);
    if (c && Math.abs(c.price - regular) < 0.005) continue;
    if (c && c.valid_from >= today) { // first seen today: correct the row in place (a row cannot end before it starts)
      await rest(env, `product_price?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ price: regular }) }); changed++; continue;
    }
    if (c) { await rest(env, `product_price?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ valid_to: addDays(today, -1) }) }); changed++; }
    newPrices.push({ product_id: p, price: regular, valid_from: today, source: "online" });
  }
  for (const b of chunk(newPrices, 200)) await rest(env, "product_price", { method: "POST", body: JSON.stringify(b) });

  // 3) promotions: strike-through "was" price. The tile has no end date, so the window runs to today + holdDays
  //    (assumed to hold until the next refresh) and is extended each time the same promo is seen again.
  //    Online promos that are no longer seen (or whose price changed) are closed, or removed if they only started today.
  type Ex = { id: string; product_id: string; promo_price: number; promotion_window: { id: string; starts_on: string; ends_on: string }[] };
  const existing = new Map<string, Ex[]>();
  for (const b of chunk(ids, 100)) {
    const out = (await rest(env, `promotion?select=id,product_id,promo_price,promotion_window(id,starts_on,ends_on)&source=eq.online&product_id=in.(${b.join(",")})`)) as Ex[];
    for (const o of out) (existing.get(o.product_id) ?? existing.set(o.product_id, []).get(o.product_id)!).push(o);
  }
  let promoNew = 0, promoExt = 0, promoClosed = 0; const yesterday = addDays(today, -1);
  for (const r of rows) {
    const p = pid.get(r.id); if (!p) continue;
    const isPromo = !!r.was && r.was > r.price; const end = addDays(today, holdDays); let matched = false;
    for (const e of existing.get(p) ?? []) {
      const active = e.promotion_window.filter((w) => w.ends_on >= yesterday);
      if (isPromo && !matched && Math.abs(Number(e.promo_price) - r.price) < 0.005 && active.length) {
        matched = true; const w = active.reduce((a, b) => (a.ends_on > b.ends_on ? a : b));
        await rest(env, `promotion_window?id=eq.${w.id}`, { method: "PATCH", body: JSON.stringify({ ends_on: end }) }); promoExt++; continue;
      }
      for (const w of active) {
        if (w.starts_on >= today) await rest(env, `promotion?id=eq.${e.id}`, { method: "DELETE" });
        else await rest(env, `promotion_window?id=eq.${w.id}`, { method: "PATCH", body: JSON.stringify({ ends_on: yesterday }) });
        promoClosed++;
      }
    }
    if (isPromo && !matched) {
      const [pr]: { id: string }[] = await rest(env, "promotion?select=id", { method: "POST", prefer: "return=representation",
        body: JSON.stringify([{ product_id: p, promo_price: r.price, regular_price: r.was, deal_type: "price_cut", source: "online", source_url: r.url }]) });
      await rest(env, "promotion_window", { method: "POST", body: JSON.stringify([{ promotion_id: pr.id, starts_on: today, ends_on: end }]) });
      promoNew++;
    }
  }
  return { products: prodRows.length, staleUnlinked: stale.length, pricesNewOrChanged: newPrices.length + changed, promoNew, promoExtended: promoExt, promoClosed };
}

// ---------- main ----------
async function main() {
  const a = process.argv.slice(2); const flag = (n: string) => a.includes(`--${n}`); const val = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const maxPages = +(val("pages") ?? 8); const only = val("query"); const file = val("from-file"); const hold = +(val("hold-days") ?? 3);
  mkdirSync("data/raw/continente", { recursive: true });

  // Probe: does the shop list a whole category by id? e.g. --try-cgid mercearias-arroz-massa-arroz
  const cg = val("try-cgid");
  if (cg) {
    const res = await fetch(`${BASE}?cgid=${encodeURIComponent(cg)}&start=0&sz=24`, { headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9" } });
    const html = await res.text(); writeFileSync(`data/raw/continente/cgid_${cg}.html`, html);
    const g = parseGrid(html); const cats = new Map<string, number>(); for (const it of g.items) cats.set(it.category ?? "?", (cats.get(it.category ?? "?") ?? 0) + 1);
    console.log(`cgid=${cg}: HTTP ${res.status}, ${g.items.length} products on page, shop total ${g.total ?? "?"}`);
    for (const [c, n] of [...cats].sort((x, y) => y[1] - x[1]).slice(0, 5)) console.log(`  ${String(n).padStart(2)}  ${c}`);
    for (const it of g.items.slice(0, 4)) console.log(`  e.g. ${it.name}  €${it.price}`);
    return;
  }

  const rules = RULES.filter((r) => !only || r.query === only);
  if (!rules.length) throw new Error(`No rule for query "${only}". Known: ${RULES.map((r) => r.query).join(", ")}`);
  const rows: Row[] = []; const seen = new Set<string>();
  for (const rule of rules) {
    let kept = 0, dropped = 0, unitMismatch = 0, pages = 0, emptyStreak = 0, total: number | null = null;
    for (let p = 0; p < maxPages; p++) {
      const html = file ? readFileSync(file, "utf8") : await fetchGrid(rule.query, p * 24);
      if (!file) writeFileSync(`data/raw/continente/${rule.query.replace(/\W+/g, "_")}_p${p}.html`, html);
      const g = parseGrid(html); total = g.total; pages++; let keptHere = 0;
      for (const it of g.items) {
        const slug = mapToIngredient(rule, it.name, it.category);
        if (!slug) { dropped++; continue; }
        const fit = fitUnit(slug, it.packQty, it.packUnit);
        if (!fit) { unitMismatch++; continue; }
        if (seen.has(it.id)) continue; seen.add(it.id); kept++; keptHere++;
        const uf = usableFraction(rule, it.name);
        rows.push({ ...it, packQty: fit.qty, packUnit: fit.unit, ingredientSlug: slug, usableQty: uf ? Math.round(fit.qty * uf * 10) / 10 : null });
      }
      if (g.skipped.length) console.log(`  skipped ${g.skipped.length} (no pack size or price): ${g.skipped.slice(0, 3).join(" | ")}`);
      // results come in relevance order, but not strictly (a page with 1 kept product can be followed by one with 3):
      // stop only after two pages in a row with no product in the right category
      emptyStreak = keptHere === 0 ? emptyStreak + 1 : 0;
      if (file || emptyStreak >= 2 || (p + 1) * 24 >= (total ?? 0)) break;
      await sleep(2000);
    }
    console.log(`${rule.query.padEnd(14)} -> ${rule.ingredient.padEnd(12)} kept ${kept}, rejected ${dropped}${unitMismatch ? `, unit mismatch ${unitMismatch}` : ""}, ${pages} page${pages > 1 ? "s" : ""}, shop has ${total ?? "?"} results`);
    if (!file) await sleep(2000);
  }
  const promo = rows.filter((r) => r.was && r.was > r.price); const net = rows.filter((r) => r.usableQty);
  console.log(`\n${rows.length} products, ${promo.length} with a strike-through "was" price, ${net.length} with a usable weight below the label weight.`);
  for (const r of rows.slice(0, 8)) console.log(`  ${r.ingredientSlug.padEnd(14)} ${r.name.slice(0, 38).padEnd(38)} ${r.packQty}${r.packUnit === "piece" ? " pc" : " " + r.packUnit}${r.usableQty ? ` (usable ${r.usableQty})` : ""}  €${r.price.toFixed(2)}${r.was ? `  (was €${r.was.toFixed(2)})` : ""}`);
  if (!flag("write")) { console.log("\nDry run: nothing was saved. Add --write to save to the database."); return; }
  console.log("\nSaving…", JSON.stringify(await save(rows, hold, [...new Set(rules.flatMap((r) => [r.ingredient, ...(r.byName ?? []).map((b) => b[1])]))])));
}
if (import.meta.main) main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
