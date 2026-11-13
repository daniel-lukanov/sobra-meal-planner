// Pingo Doce scraper + importer for the Sobra database. Run with Bun:
//   bun db/scripts/pingodoce.ts                       dry run: fetch category pages, parse, print a summary (writes nothing)
//   bun db/scripts/pingodoce.ts --query arroz         only one ingredient rule
//   bun db/scripts/pingodoce.ts --write               also save to the database (needs db/.env)
//   bun db/scripts/pingodoce.ts --from-file data/raw/pingodoce/pd_home.html   parse a saved page (every rule, no category filter on the page)
// Respects the shop's robots.txt: only plain category pages (no search, no ?start= / ?sz= / ?cgid= URLs), one request every ~2 s.
// The shop is Salesforce Commerce Cloud, like Continente, but it renders the tiles straight into the page (no JSON call).
// Educational prototype use. The secret key stays in db/.env and is never printed.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { RULES, fitUnit, mapToIngredient, usableFraction, parseQuantity, save, decode, text, num, sleep, type Parsed, type Row } from "./continente";

const BASE = "https://www.pingodoce.pt/home/produtos/";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Pingo Doce's categories are coarser than Continente's (one page for potatoes, onions and garlic), so the name filters in the
// shared RULES do more of the work here. paths: category pages to read; a product counts as that category when it appears on
// the page (a tile's own link points at its primary category, which can differ, e.g. lemons sit under "fruta-da-epoca").
// include: replaces the shared name filter where Pingo Doce names things differently.
const SHOP: Record<string, { paths: string[]; include?: RegExp }> = {
  batata: { paths: ["frutas-e-vegetais/vegetais/batatas-cebolas-e-alhos"] },
  cebola: { paths: ["frutas-e-vegetais/vegetais/batatas-cebolas-e-alhos"] },
  cenoura: { paths: ["frutas-e-vegetais/vegetais/cenouras-couves-e-brocolos"] },
  ovos: { paths: ["ovos"] },
  arroz: { paths: ["mercearia/arroz-massa-e-leguminosas/arroz"] },
  "grão de bico": { paths: ["mercearia/conservas/feijao-grao-e-outros"], include: /^gr[ãa]o( de)? bico/i }, // "Grão Bico em Lata"
  pimento: { paths: ["frutas-e-vegetais/vegetais/tomates-pepinos-e-pimentos"] },
  atum: { paths: ["mercearia/conservas/atum"] },
  espinafre: { paths: ["frutas-e-vegetais/vegetais/outros-vegetais", "frutas-e-vegetais/vegetais/saladas-e-legumes-preparados", "congelados/frutas-e-vegetais/vegetais-congelados"] },
  frango: { paths: ["talho/aves/frango"] },
  esparguete: { paths: ["mercearia/arroz-massa-e-leguminosas/massa"] },
  "leite de coco": { paths: ["mercearia/sobremesas/leite-condensado-e-de-coco"] },
  limão: { paths: ["frutas-e-vegetais/frutas/laranjas-tangerinas-e-limoes"] },
  "molho de soja": { paths: ["mercearia/temperos-e-molhos/outros-molhos-e-temperos"] },
  azeite: { paths: ["mercearia/azeite-oleo-e-vinagre/azeite"] },
};

// ---------- parsing ----------
export type PdTile = Parsed & { path: string | null };

// One product tile -> price, pack size, promo. The tile carries a JSON blob (data-gtm-info) with name, brand and price, the
// category path is in the product link, the pack size sits in "1.2 Kg | 6,66 €/Kg", and a promo shows a strike-through list price.
export function parsePage(html: string): { items: PdTile[]; skipped: string[]; moreButton: boolean } {
  const items: PdTile[] = []; const skipped: string[] = []; const seen = new Set<string>();
  for (const t of html.split('<div class="product-tile-pd" data-pid="').slice(1)) {
    const id = t.slice(0, t.indexOf('"'));
    if (seen.has(id)) continue; seen.add(id);
    try {
      const gtm = JSON.parse(decode(t.match(/data-gtm-info='([^']*)'/)?.[1] ?? "{}"));
      const it = gtm.items?.[0] ?? {};
      const href = t.match(/product-name-link">\s*<a href="([^"]+)"/)?.[1] ?? null;
      const name = text(t.match(/product-name-link">\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? it.item_name ?? "");
      const unitText = text(t.match(/class="product-unit">([\s\S]*?)<\/div>/)?.[1] ?? "");
      const qtyText = unitText.split("|")[0]?.trim() ?? "";
      const sale = t.match(/class="sales[^"]*">\s*<span class="value" content="([\d.]+)"/)?.[1];
      const price = sale ? Number(sale) : Number(it.price ?? gtm.value);
      const wasRaw = t.match(/strike-through[\s\S]*?<span class="value" content="([\d.]+)"/)?.[1];
      const was = wasRaw ? Number(wasRaw) : null;
      let q = parseQuantity(qtyText);
      // Loose produce ("Cebola a Granel", "Limão"): the price is per kg ("1,19 €/Kg") and the quantity is the weight of one
      // typical piece. There is no pack, so price one kg (same as the Continente scraper).
      const priceBlock = text(t.match(/class="product-price[^"]*">([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? "");
      if (/€\s*\/\s*kg/i.test(priceBlock) && !unitText.includes("|")) q = { qty: 1000, unit: "g" };
      if (!name || !isFinite(price) || !q) { skipped.push(`${id} ${name} [${unitText}]`); continue; }
      const path = href ? decode(href).replace(/%E2%80%8B/gi, "").replace(/^\/home\/produtos\//, "").split("/").slice(0, -1).join("/") : null;
      items.push({ id, name, brand: it.item_brand ? decode(String(it.item_brand)) || null : null, category: path, path,
        url: href ? `https://www.pingodoce.pt${decode(href)}` : null, price, was: was && was > price ? was : null,
        packQty: q.qty, packUnit: q.unit, qtyText });
    } catch { skipped.push(`${id} (parse error)`); }
  }
  return { items, skipped, moreButton: /show-more|load-more|ver mais|ver_mais/i.test(html) };
}

// ---------- fetching ----------
async function fetchPage(path: string): Promise<string> {
  const res = await fetch(BASE + path, { headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.text();
}

// ---------- main ----------
async function main() {
  const a = process.argv.slice(2); const flag = (n: string) => a.includes(`--${n}`); const val = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const only = val("query"); const file = val("from-file"); const hold = +(val("hold-days") ?? 3);
  mkdirSync("data/raw/pingodoce", { recursive: true });
  const queries = Object.keys(SHOP).filter((q) => !only || q === only);
  if (!queries.length) throw new Error(`No rule for "${only}". Known: ${Object.keys(SHOP).join(", ")}`);

  // 1) read each category page once
  const pages = new Map<string, PdTile[]>();
  if (file) pages.set("(file)", parsePage(readFileSync(file, "utf8")).items);
  else for (const path of [...new Set(queries.flatMap((q) => SHOP[q]!.paths))]) {
    const cache = `data/raw/pingodoce/cat_${path.replace(/\W+/g, "_")}.html`;
    const html = await fetchPage(path); writeFileSync(cache, html);
    const g = parsePage(html); pages.set(path, g.items);
    console.log(`${path.padEnd(62)} ${String(g.items.length).padStart(3)} products${g.moreButton ? "  (page has a 'show more' control: only the first page is read, as robots.txt asks)" : ""}`);
    if (g.skipped.length) console.log(`    skipped ${g.skipped.length} (no pack size or price): ${g.skipped.slice(0, 3).join(" | ")}`);
    await sleep(2000);
  }
  const all = new Map<string, PdTile>(); const onPages = new Map<string, Set<string>>();
  for (const [page, l] of pages) for (const t of l) { all.set(t.id, t); (onPages.get(t.id) ?? onPages.set(t.id, new Set()).get(t.id)!).add(page); }

  // 2) map tiles to ingredients with the shared name rules
  const rows: Row[] = []; const seen = new Set<string>();
  for (const q of queries) {
    const rule = RULES.find((r) => r.query === q); if (!rule) throw new Error(`RULES has no entry for "${q}"`);
    const shop = SHOP[q]!; let kept = 0, dropped = 0, unitMismatch = 0;
    const r2 = { ...rule, category: /./, include: shop.include ?? rule.include };
    for (const it of all.values()) {
      if (!file && !shop.paths.some((pth) => onPages.get(it.id)?.has(pth))) continue;
      const slug = mapToIngredient(r2, it.name, "page");
      if (!slug) { dropped++; continue; }
      const fit = fitUnit(slug, it.packQty, it.packUnit);
      if (!fit) { unitMismatch++; continue; }
      if (seen.has(it.id)) continue; seen.add(it.id); kept++;
      const uf = usableFraction(rule, it.name);
      const { path: _p, ...rest } = it;
      rows.push({ ...rest, packQty: fit.qty, packUnit: fit.unit, ingredientSlug: slug, usableQty: uf ? Math.round(fit.qty * uf * 10) / 10 : null });
    }
    console.log(`${q.padEnd(14)} -> ${rule.ingredient.padEnd(12)} kept ${kept}, name filter rejected ${dropped}${unitMismatch ? `, unit mismatch ${unitMismatch}` : ""}`);
  }
  const promo = rows.filter((r) => r.was && r.was > r.price);
  console.log(`\n${rows.length} products, ${promo.length} with a strike-through "was" price.`);
  for (const r of rows.slice(0, 10)) console.log(`  ${r.ingredientSlug.padEnd(14)} ${r.name.slice(0, 38).padEnd(38)} ${r.packQty}${r.packUnit === "piece" ? " pc" : " " + r.packUnit}${r.usableQty ? ` (usable ${r.usableQty})` : ""}  €${r.price.toFixed(2)}${r.was ? `  (was €${r.was.toFixed(2)})` : ""}`);
  if (!flag("write")) { console.log("\nDry run: nothing was saved. Add --write to save to the database."); return; }
  if (file) throw new Error("--write is not allowed with --from-file (a saved page has no category filter).");
  const touched = [...new Set(queries.flatMap((q) => { const r = RULES.find((x) => x.query === q)!; return [r.ingredient, ...(r.byName ?? []).map((b) => b[1])]; }))];
  console.log("\nSaving…", JSON.stringify(await save(rows, hold, touched, "pingo-doce")));
}
if (import.meta.main) main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
