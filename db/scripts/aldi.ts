// Aldi Portugal offers importer for the pratico database. Run with Bun:
//   bun db/scripts/aldi.ts                  dry run: fetch the weekly-offers page, parse, print a summary (writes nothing)
//   bun db/scripts/aldi.ts --write          also save to the database (needs db/.env)
//   bun db/scripts/aldi.ts --from-file data/raw/aldi/aldi_oportunidades.html   parse a saved page
// Aldi has no online grocery shop, only the weekly offers page (aldi.pt/oportunidades-da-semana.html). The page embeds its data as
// JSON (__NEXT_DATA__ -> apiData -> OFFER_GET -> algoliaDataMap): name, pack size ("salesUnit"), price, struck-through price and the
// week the offer is valid. One request per run. robots.txt does not disallow this page. Offers change every Monday.
// Educational prototype use. The secret key stays in db/.env and is never printed.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { RULES, fitUnit, mapToIngredient, usableFraction, parseQuantity, save, type Row } from "./continente";

const URL_OFFERS = "https://www.aldi.pt/oportunidades-da-semana.html";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// ready-made or processed products that share a word with a raw ingredient ("Batatas Fritas", "Frango Cozido")
const NOT_RAW = /(fritas|cozid|desfiad|assad|panad|pr[ée]-?cozin|congelad|snack|chips|salada|pur[ée]|sopa)/i;

export type AldiOffer = { id: string; name: string; brand: string | null; image: string | null; url: string | null; price: number; was: number | null;
  packQty: number; packUnit: "g" | "ml" | "piece"; qtyText: string; from: string; until: string };

/** "500 g embalagem - 500 g" -> 500 g; "kg - 1000 g" (loose, priced per kg) -> 1000 g; "1.5 l unidade" -> 1500 ml */
export function parseSales(s: string): { qty: number; unit: "g" | "ml" | "piece" } | null {
  const t = s.trim().toLowerCase();
  if (/^kg\b/.test(t)) return { qty: 1000, unit: "g" };
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|cl)\b/);
  if (m) {
    const n = Number(m[1]!.replace(",", ".")); const u = m[2]!;
    return u === "kg" ? { qty: n * 1000, unit: "g" } : u === "g" ? { qty: n, unit: "g" } : u === "l" ? { qty: n * 1000, unit: "ml" }
      : u === "cl" ? { qty: n * 10, unit: "ml" } : { qty: n, unit: "ml" };
  }
  return parseQuantity(t);
}

function nextData(html: string): any {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("No __NEXT_DATA__ in the page (Aldi changed its page?)");
  return JSON.parse(m[1]!);
}
function findKey(o: any, k: string): any {
  if (o && typeof o === "object") {
    if (k in o) return o[k];
    for (const v of Object.values(o)) { const r = findKey(v, k); if (r !== undefined) return r; }
  }
  return undefined;
}

/** Offers valid at `now` (epoch seconds) with a public price and a usable pack size. */
export function parseOffers(html: string, now = Date.now() / 1000): { items: AldiOffer[]; skipped: string[]; notNow: number } {
  const api = findKey(nextData(html), "apiData"); const j = typeof api === "string" ? JSON.parse(api) : api;
  const map: Record<string, any> = j?.[0]?.[1]?.res?.algoliaDataMap ?? {};
  const items: AldiOffer[] = []; const skipped: string[] = []; let notNow = 0;
  const day = (e: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(e * 1000));
  for (const [id, x] of Object.entries(map)) {
    const name = String(x.name ?? "").trim(); const cur = x.currentPrice ?? {};
    const price = Number(cur.priceValue); const a = Number(cur.validFrom), b = Number(cur.validUntil);
    if (!name || !isFinite(price) || price <= 0) { skipped.push(`${id} ${name} (no price)`); continue; }
    if (isFinite(a) && isFinite(b) && !(a <= now && now <= b)) { notNow++; continue; }
    if (x.isAvailable === false) { skipped.push(`${id} ${name} (not available)`); continue; }
    const q = parseSales(String(x.salesUnit ?? ""));
    if (!q) { skipped.push(`${id} ${name} (no pack size: "${x.salesUnit ?? ""}")`); continue; }
    const promo = (x.promotionPrices ?? []).find((p: any) => Number(p.validFrom) <= now && now <= Number(p.validUntil));
    const wasRaw = Number(cur.strikePrice?.strikePriceValue ?? promo?.strikePrice?.strikePriceValue);
    const image = (x.assets ?? []).find((s: any) => s.type === "primary")?.url ?? null;
    items.push({ id, name, brand: x.brandName ?? null, image, url: x.productSlug ? `https://www.aldi.pt/produtos/${x.productSlug}.html` : null,
      price, was: isFinite(wasRaw) && wasRaw > price ? wasRaw : null, packQty: q.qty, packUnit: q.unit, qtyText: String(x.salesUnit ?? ""),
      from: promo?.validFromLocalDate ?? day(a), until: promo?.validUntilLocalDate ?? day(b) });
  }
  return { items, skipped, notNow };
}

async function main() {
  const a = process.argv.slice(2); const flag = (n: string) => a.includes(`--${n}`); const val = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const file = val("from-file"); mkdirSync("data/raw/aldi", { recursive: true });
  let html: string;
  if (file) html = readFileSync(file, "utf8");
  else {
    const res = await fetch(URL_OFFERS, { headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${URL_OFFERS}`);
    html = await res.text(); writeFileSync("data/raw/aldi/aldi_oportunidades.html", html);
  }
  const { items, skipped, notNow } = parseOffers(html);
  console.log(`${items.length} offers on the shelf now (${notNow} for other weeks, ${skipped.length} skipped)`);
  if (skipped.length) console.log("  skipped e.g.: " + skipped.slice(0, 3).join(" | "));

  const rows: Row[] = []; const seen = new Set<string>(); const images: { slug: string; name: string; image: string | null }[] = [];
  for (const rule of RULES) {
    const r2 = { ...rule, category: /./ }; let kept = 0, dropped = 0, unit = 0;
    for (const it of items) {
      if (NOT_RAW.test(it.name)) continue;
      const slug = mapToIngredient(r2, it.name, "page"); if (!slug) { dropped++; continue; }
      const fit = fitUnit(slug, it.packQty, it.packUnit); if (!fit) { unit++; continue; }
      if (seen.has(it.id)) continue; seen.add(it.id); kept++;
      const uf = usableFraction(rule, it.name);
      rows.push({ id: it.id, name: it.name, brand: it.brand, category: null, url: it.url, price: it.price, was: it.was, packQty: fit.qty, packUnit: fit.unit,
        qtyText: it.qtyText, ingredientSlug: slug, usableQty: uf ? Math.round(fit.qty * uf * 10) / 10 : null, until: it.until });
      images.push({ slug, name: it.name, image: it.image });
    }
    if (kept) console.log(`${rule.query.padEnd(14)} -> ${rule.ingredient.padEnd(12)} kept ${kept}${unit ? `, unit mismatch ${unit}` : ""}`);
  }
  const promo = rows.filter((r) => r.was && r.was > r.price);
  console.log(`\n${rows.length} matching products, ${promo.length} with a strike-through price.`);
  for (const r of rows.slice(0, 12)) console.log(`  ${r.ingredientSlug.padEnd(14)} ${r.name.slice(0, 38).padEnd(38)} ${r.packQty}${r.packUnit === "piece" ? " pc" : " " + r.packUnit}  €${r.price.toFixed(2)}${r.was ? `  (was €${r.was.toFixed(2)})` : ""}  until ${r.until}`);
  writeFileSync("data/raw/aldi/matched_images.json", JSON.stringify(images, null, 1));
  if (!flag("write")) { console.log("\nDry run: nothing was saved. Add --write to save to the database."); return; }
  if (file) throw new Error("--write is not allowed with --from-file.");
  const touched = [...new Set(RULES.flatMap((r) => [r.ingredient, ...(r.byName ?? []).map((b) => b[1])]))];
  console.log("\nSaving…", JSON.stringify(await save(rows, 3, touched, "aldi", "flyer")));
}
if (import.meta.main) main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
