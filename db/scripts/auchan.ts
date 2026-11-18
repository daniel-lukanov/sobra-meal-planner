// Auchan Portugal scraper + importer for the pratico database. Run with Bun:
//   bun db/scripts/auchan.ts                       dry run: fetch category pages, parse, print a summary (writes nothing)
//   bun db/scripts/auchan.ts --query arroz         only one ingredient rule
//   bun db/scripts/auchan.ts --write               also save to the database (needs db/.env)
//   bun db/scripts/auchan.ts --from-file data/raw/auchan/auchan_cat_mercearia.html   parse a saved page (every rule, no category filter)
// Auchan's online shop is Salesforce Commerce Cloud, like Continente and Pingo Doce. Tiles are in the page itself.
// robots.txt disallows search (/pesquisa?q=) and the filter/sort URLs (prefn, prefv, srule, pmin, pmax), which includes the
// "show more" button's URL. So only the plain category page is read, once per category (the first 24 products), 1 request every ~2 s.
// A promotion tile shows a struck-through list price, and (unlike the other shops) the promotion's end date: "de 07/10/2026 a 31/12/2026".
// Educational prototype use. The secret key stays in db/.env and is never printed.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { RULES, fitUnit, mapToIngredient, usableFraction, parseQuantity, save, decode, text, num, sleep, type Parsed, type Row } from "./continente";

const BASE = "https://www.auchan.pt/pt/";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Category pages that hold our ingredients (paths found in Auchan's product sitemap). A product counts for an ingredient when it
// sits on the ingredient's page and passes the shared name filter. include: replaces the shared name filter where Auchan names differ.
const SHOP: Record<string, { paths: string[]; include?: RegExp }> = {
  batata: { paths: ["produtos-frescos/legumes/batatas-alho-e-cebola"] },
  cebola: { paths: ["produtos-frescos/legumes/batatas-alho-e-cebola"] },
  cenoura: { paths: ["produtos-frescos/legumes/abobora-cenoura-e-alho-frances"] },
  ovos: { paths: ["alimentacao/produtos-lacteos/ovos"] },
  arroz: { paths: ["alimentacao/mercearia/arroz-e-massa/arroz"] },
  "grão de bico": { paths: ["alimentacao/mercearia/conservas/cogumelo-milho-ervilha-feijao-e-outros"] },
  pimento: { paths: ["produtos-frescos/legumes/tomate-pepino-e-pimentos"] },
  atum: { paths: ["alimentacao/mercearia/conservas/atum"] },
  espinafre: { paths: ["produtos-frescos/legumes/couves-brocolos-e-espinafres"] },
  frango: { paths: ["produtos-frescos/talho/frango-e-galinha"] },
  esparguete: { paths: ["alimentacao/mercearia/arroz-e-massa/esparguete-aletria-e-meadas"] },
  "leite de coco": { paths: ["alimentacao/sabores-do-mundo/cozinha-asiatica/molhos-e-temperos"] },
  limão: { paths: ["produtos-frescos/fruta/laranjas-clementinas-e-limoes"] },
  "molho de soja": { paths: ["alimentacao/sabores-do-mundo/cozinha-asiatica/molhos-e-temperos"] },
  azeite: { paths: ["alimentacao/mercearia/azeite-oleo-e-vinagre/azeite-virgem-e-extra-virgem", "alimentacao/mercearia/azeite-oleo-e-vinagre/azeite"] },
  "carne picada de vaca": { paths: ["produtos-frescos/talho/hamburgueres-e-carne-picada", "produtos-frescos/talho/vitela-e-novilho"] },
  "lombo de porco": { paths: ["produtos-frescos/talho/porco"] },
  pescada: { paths: ["congelados/peixe/postas-de-peixe"] },
};

// ---------- parsing ----------
export type AuTile = Parsed & { path: string | null; until?: string };

/** "de 07/10/2026 a 31/12/2026" -> "2026-12-31" */
export function promoEnd(s: string): string | undefined {
  const m = s.match(/\ba\s+(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

// One product tile -> price, pack size, promo. The pack size is in the name ("ESPARGUETE AUCHAN 1KG"); loose produce has none and
// shows "1.19 €/Kg", so it is priced per 1 kg (same rule as the other scrapers). A promo tile has a strike-through list price and a date range.
export function parsePage(html: string): { items: AuTile[]; skipped: string[]; moreButton: boolean } {
  const items: AuTile[] = []; const skipped: string[] = []; const seen = new Set<string>();
  for (const t of html.split('<div class="product-tile auc-product-tile').slice(1)) {
    const id = t.match(/data-pid="(\d+)"/)?.[1];
    if (!id || seen.has(id)) continue; seen.add(id);
    try {
      const gtm = JSON.parse(decode(t.match(/data-gtm="([^"]*)"/)?.[1] ?? "{}"));
      const href = t.match(/auc-product-tile__name">[\s\S]*?<a[^>]*href="([^"]+)"/)?.[1] ?? null;
      const name = text(t.match(/auc-product-tile__name">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? gtm.name ?? "");
      const unitText = text(t.match(/auc-measures--price-per-unit">([\s\S]*?)<\/span>/)?.[1] ?? "");
      const sale = t.match(/class="sales">\s*<span class="value" content="([\d.]+)"/)?.[1];
      const price = sale ? Number(sale) : num(String(gtm.price ?? ""));
      const wasRaw = t.match(/strike-through value" content="([\d.]+)"/)?.[1];
      const was = wasRaw ? Number(wasRaw) : null;
      const until = promoEnd(text(t.match(/auc-price__promotion--pdp__date">([\s\S]*?)<\/span>/)?.[1] ?? ""));
      // loose goods: the big price is per kg ("6,29 €/Kg"); the small "1.57 €" text is only the price of the minimum quantity
      const perKg = /auc-avgWeight">\s*\/\s*kg/i.test(t) || /€\s*\/\s*kg/i.test(unitText);
      const dozen = /meia d[úu]zia/i.test(name) ? 6 : /(uma )?d[úu]zia/i.test(name) ? 12 : 0;
      let q = parseQuantity(name);
      if (!q && dozen) q = { qty: dozen, unit: "piece" };
      if (!q && (perKg || /\bkg$/i.test(name))) q = { qty: 1000, unit: "g" };
      if (!name || !isFinite(price) || !q) { skipped.push(`${id} ${name} [${unitText}]`); continue; }
      const path = href ? decode(href).replace(/^\/pt\//, "").split("/").slice(0, -2).join("/") : null;
      items.push({ id, name, brand: gtm.brand ? decode(String(gtm.brand)) || null : null, category: path, path,
        url: href ? `https://www.auchan.pt${decode(href)}` : null, price, was: was && was > price ? was : null,
        packQty: q.qty, packUnit: q.unit, qtyText: unitText, ...(until && was ? { until } : {}) });
    } catch { skipped.push(`${id} (parse error)`); }
  }
  return { items, skipped, moreButton: /auc-js-show-more-next-button/.test(html) };
}

// ---------- fetching ----------
async function fetchPage(path: string): Promise<string> {
  const res = await fetch(BASE + path + "/", { headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.text();
}

// ---------- main ----------
async function main() {
  const a = process.argv.slice(2); const flag = (n: string) => a.includes(`--${n}`); const val = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const only = val("query"); const file = val("from-file"); const hold = +(val("hold-days") ?? 3);
  mkdirSync("data/raw/auchan", { recursive: true });
  const queries = Object.keys(SHOP).filter((q) => !only || q === only);
  if (!queries.length) throw new Error(`No rule for "${only}". Known: ${Object.keys(SHOP).join(", ")}`);

  // 1) read each category page once
  const pages = new Map<string, AuTile[]>();
  if (file) pages.set("(file)", parsePage(readFileSync(file, "utf8")).items);
  else for (const path of [...new Set(queries.flatMap((q) => SHOP[q]!.paths))]) {
    const cache = `data/raw/auchan/cat_${path.replace(/\W+/g, "_")}.html`;
    let g: ReturnType<typeof parsePage>;
    try { const html = await fetchPage(path); writeFileSync(cache, html); g = parsePage(html); }
    catch (e) { console.log(`${path.padEnd(78)} FAILED: ${(e as Error).message}`); await sleep(2000); continue; }
    pages.set(path, g.items);
    console.log(`${path.padEnd(78)} ${String(g.items.length).padStart(3)} products${g.moreButton ? "  (more pages exist: only the first is read, as robots.txt asks)" : ""}`);
    if (g.skipped.length) console.log(`    skipped ${g.skipped.length} (no pack size or price): ${g.skipped.slice(0, 3).join(" | ")}`);
    await sleep(2000);
  }
  const all = new Map<string, AuTile>(); const onPages = new Map<string, Set<string>>();
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
  for (const r of rows.slice(0, 10)) console.log(`  ${r.ingredientSlug.padEnd(14)} ${r.name.slice(0, 38).padEnd(38)} ${r.packQty}${r.packUnit === "piece" ? " pc" : " " + r.packUnit}${r.usableQty ? ` (usable ${r.usableQty})` : ""}  €${r.price.toFixed(2)}${r.was ? `  (was €${r.was.toFixed(2)}${r.until ? `, until ${r.until}` : ""})` : ""}`);
  if (!flag("write")) { console.log("\nDry run: nothing was saved. Add --write to save to the database."); return; }
  if (file) throw new Error("--write is not allowed with --from-file (a saved page has no category filter).");
  const touched = [...new Set(queries.flatMap((q) => { const r = RULES.find((x) => x.query === q)!; return [r.ingredient, ...(r.byName ?? []).map((b) => b[1])]; }))];
  console.log("\nSaving…", JSON.stringify(await save(rows, hold, touched, "auchan")));
}
if (import.meta.main) main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
