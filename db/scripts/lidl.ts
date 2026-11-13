// Lidl Portugal scraper + importer for the Sobra database. Run with Bun:
//   bun db/scripts/lidl.ts                       dry run: fetch the product hub pages, parse, print a summary (writes nothing)
//   bun db/scripts/lidl.ts --query arroz         only one ingredient rule
//   bun db/scripts/lidl.ts --write               also save to the database (needs db/.env)
//   bun db/scripts/lidl.ts --from-file data/raw/lidl/lidl_h_despensa.html   parse a saved page (no hub filter)
// Lidl PT has no online grocery: food appears as in-store offers that rotate weekly. Each product on a hub page carries the dates
// it is on the shelf, so this keeps only what is in store TODAY, and re-running weekly replaces last week's offers.
// Prices are the public shelf price. Lidl Plus-only prices (app members) are not used.
// Respects robots.txt (only the search page is disallowed): plain hub pages, one request every ~2 s. Educational prototype use.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { RULES, fitUnit, mapToIngredient, usableFraction, parseQuantity, save, decode, num, sleep, type Row } from "./continente";

const BASE = "https://www.lidl.pt/h/";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// hub pages that hold our ingredients. A product counts for an ingredient when it appears on the ingredient's hub and passes the
// shared name filter (applied to the title without the brand). include: replaces the shared name filter where Lidl names differ.
const HUB = {
  produce: "frutas-e-legumes/h10071012", pantry: "despensa/h10096095", oils: "oleos-molhos-e-condimentos/h10096110",
  dairy: "queijos-laticinios-e-ovos/h10095761", meat: "carne-e-aves/h10095752", frozen: "alimentos-congelados-alimentos-congelados/h10071049",
};
const SHOP: Record<string, { hubs: string[]; include?: RegExp }> = {
  batata: { hubs: [HUB.produce] }, cebola: { hubs: [HUB.produce] }, cenoura: { hubs: [HUB.produce] }, pimento: { hubs: [HUB.produce] },
  limão: { hubs: [HUB.produce] }, espinafre: { hubs: [HUB.produce, HUB.frozen] },
  ovos: { hubs: [HUB.dairy] },
  // the meat hub also lists pork and beef, so a chicken product must say "frango" (the shared filter would take "perna de porco")
  frango: { hubs: [HUB.meat], include: /^(frango|metades? de frango|peito de frango|bifes? de frango|lombinhos? de frango|(sobre)?coxas? de frango|pernas? de frango|perninhas? de frango)/i },
  arroz: { hubs: [HUB.pantry] }, esparguete: { hubs: [HUB.pantry] }, atum: { hubs: [HUB.pantry] },
  "grão de bico": { hubs: [HUB.pantry], include: /^gr[ãa]o( de)? bico/i }, "leite de coco": { hubs: [HUB.pantry] },
  "molho de soja": { hubs: [HUB.oils, HUB.pantry] }, azeite: { hubs: [HUB.oils] },
};

// ---------- parsing ----------
export type LidlTile = { id: string; title: string; name: string; brand: string | null; url: string | null; price: number; was: number | null;
  packQty: number; packUnit: "g" | "ml" | "piece"; qtyText: string; inStoreNow: boolean; until: string | null };

const lisbonDay = (epochSec: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(epochSec * 1000));

export function parseHub(html: string, now = Date.now() / 1000): { items: LidlTile[]; skipped: string[]; notNow: number } {
  const items: LidlTile[] = []; const skipped: string[] = []; let notNow = 0; const seen = new Set<string>();
  for (const m of html.matchAll(/data-grid-data="([^"]*)"/g)) {
    let x: any;
    try { x = JSON.parse(decode(m[1]!)); } catch { skipped.push("(parse error)"); continue; }
    const id = String(x.itemId ?? x.productId ?? ""); const name = String(x.fullTitle ?? "").replace(/^-\s*/, "").trim();
    const title = String(x.title ?? name).trim();
    if (!id || seen.has(id)) continue; seen.add(id);
    if (x.category && x.category !== "Food") continue;
    // on the shelf today? (the page also lists past and upcoming offers)
    const start = Number(x.storeStartDate), end = Number(x.storeEndDate);
    const inStoreNow = isFinite(start) && isFinite(end) ? start <= now && now <= end : x.store !== false;
    if (!inStoreNow) { notNow++; continue; }
    const p = x.price ?? {}; const cur = x.regionsPrices?.["1"]?.currentPrice ?? {};
    const price = Number(p.price); if (!isFinite(price) || price <= 0) { skipped.push(`${id} ${name} (no public price: Lidl Plus only)`); continue; }
    const wasRaw = Number(p.oldPrice ?? cur.oldPrice ?? cur.discount?.deletedPrice);
    const qtyText = String(p.packaging?.text ?? ""); let q = /\d\s*-\s*\d/.test(qtyText) ? null : parseQuantity(qtyText);
    if (/vendido ao kg/i.test(qtyText)) q = { qty: 1000, unit: "g" }; // loose: the price is per kg
    // fallback: derive the pack weight from the unit price ("1 kg = 5,24")
    if (!q) { const b = String(p.basePrice?.text ?? "").match(/^(\d+)\s*(kg|g|l|ml)\s*=\s*([\d,]+)/i);
      if (b && !/unid/i.test(qtyText)) { const per = num(b[3]!); const unitQty = +b[1]! * (/^k|^l$/i.test(b[2]!) && !/ml/i.test(b[2]!) ? 1000 : 1); const unit = /l/i.test(b[2]!) ? "ml" : "g";
        if (per > 0) q = { qty: Math.round((price / per) * unitQty / 5) * 5, unit }; } }
    if (!q) { skipped.push(`${id} ${name} [${qtyText || "no pack size"}]`); continue; }
    const until = cur.endDate ? String(cur.endDate).slice(0, 10) : isFinite(end) ? lisbonDay(end) : null;
    items.push({ id, title, name, brand: x.brand?.name ? String(x.brand.name) : null, url: x.canonicalUrl ? `https://www.lidl.pt${x.canonicalUrl}` : null,
      price, was: isFinite(wasRaw) && wasRaw > price ? wasRaw : null, packQty: q.qty, packUnit: q.unit, qtyText, inStoreNow, until });
  }
  return { items, skipped, notNow };
}

// ---------- fetching ----------
async function fetchHub(path: string): Promise<string> {
  const res = await fetch(BASE + path, { headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.text();
}

// ---------- main ----------
async function main() {
  const a = process.argv.slice(2); const flag = (n: string) => a.includes(`--${n}`); const val = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const only = val("query"); const file = val("from-file"); const hold = +(val("hold-days") ?? 3);
  mkdirSync("data/raw/lidl", { recursive: true });
  const queries = Object.keys(SHOP).filter((q) => !only || q === only);
  if (!queries.length) throw new Error(`No rule for "${only}". Known: ${Object.keys(SHOP).join(", ")}`);

  const pages = new Map<string, LidlTile[]>();
  if (file) { const g = parseHub(readFileSync(file, "utf8")); pages.set("(file)", g.items); console.log(`${file}: ${g.items.length} in store today, ${g.notNow} past or upcoming offers left out`); }
  else for (const hub of [...new Set(queries.flatMap((q) => SHOP[q]!.hubs))]) {
    const html = await fetchHub(hub); writeFileSync(`data/raw/lidl/hub_${hub.replace(/\W+/g, "_")}.html`, html);
    const g = parseHub(html); pages.set(hub, g.items);
    console.log(`${hub.padEnd(58)} ${String(g.items.length).padStart(3)} in store today, ${g.notNow} past or upcoming left out`);
    if (g.skipped.length) console.log(`    skipped ${g.skipped.length}: ${g.skipped.slice(0, 3).join(" | ")}`);
    await sleep(2000);
  }
  const all = new Map<string, LidlTile>(); const onHubs = new Map<string, Set<string>>();
  for (const [hub, l] of pages) for (const t of l) { all.set(t.id, t); (onHubs.get(t.id) ?? onHubs.set(t.id, new Set()).get(t.id)!).add(hub); }

  const rows: Row[] = []; const seen = new Set<string>();
  for (const q of queries) {
    const rule = RULES.find((r) => r.query === q); if (!rule) throw new Error(`RULES has no entry for "${q}"`);
    const shop = SHOP[q]!; let kept = 0, dropped = 0, unitMismatch = 0;
    const r2 = { ...rule, category: /./, include: shop.include ?? rule.include };
    for (const it of all.values()) {
      if (!file && !shop.hubs.some((h) => onHubs.get(it.id)?.has(h))) continue;
      const slug = mapToIngredient(r2, it.title, "hub");
      if (!slug) { dropped++; continue; }
      const fit = fitUnit(slug, it.packQty, it.packUnit);
      if (!fit) { unitMismatch++; continue; }
      if (seen.has(it.id)) continue; seen.add(it.id); kept++;
      const uf = usableFraction(rule, it.title);
      rows.push({ id: it.id, name: it.name, brand: it.brand, category: null, url: it.url, price: it.price, was: it.was, packQty: fit.qty, packUnit: fit.unit,
        qtyText: it.qtyText, ingredientSlug: slug, usableQty: uf ? Math.round(fit.qty * uf * 10) / 10 : null, ...(it.until ? { until: it.until } : {}) });
    }
    console.log(`${q.padEnd(14)} -> ${rule.ingredient.padEnd(12)} kept ${kept}, name filter rejected ${dropped}${unitMismatch ? `, unit mismatch ${unitMismatch}` : ""}`);
  }
  const promo = rows.filter((r) => r.was && r.was > r.price);
  console.log(`\n${rows.length} products in store today, ${promo.length} with an old price.`);
  for (const r of rows.slice(0, 15)) console.log(`  ${r.ingredientSlug.padEnd(14)} ${r.name.slice(0, 38).padEnd(38)} ${r.packQty}${r.packUnit === "piece" ? " pc" : " " + r.packUnit}  €${r.price.toFixed(2)}${r.was ? `  (was €${r.was.toFixed(2)})` : ""}  until ${r.until ?? "?"}`);
  if (!flag("write")) { console.log("\nDry run: nothing was saved. Add --write to save to the database."); return; }
  if (file) throw new Error("--write is not allowed with --from-file (a saved page has no hub filter).");
  const touched = [...new Set(queries.flatMap((q) => { const r = RULES.find((x) => x.query === q)!; return [r.ingredient, ...(r.byName ?? []).map((b) => b[1])]; }))];
  console.log("\nSaving…", JSON.stringify(await save(rows, hold, touched, "lidl", "flyer")));
}
if (import.meta.main) main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
