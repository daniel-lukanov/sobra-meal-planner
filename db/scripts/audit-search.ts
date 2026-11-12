// Read-only audit of ONE search term: scans ALL result pages (no stopping rule, no database)
// and prints how many results fall in each shop category, plus every product in the
// categories you name. Use it to see whether real products hide deeper in the results.
//   bun db/scripts/audit-search.ts "limão" --show "Frutas|Legumes" [--max-pages 14]
import { parseGrid } from "./continente.ts";

const args = process.argv.slice(2);
const q = args.find((a) => !a.startsWith("--")) ?? "";
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const show = new RegExp(opt("--show") ?? "Frutas|Legumes", "i");
const maxPages = Number(opt("--max-pages") ?? 14);
if (!q) { console.error('usage: bun db/scripts/audit-search.ts "<term>" --show "<category regex>"'); process.exit(1); }

const BASE = "https://www.continente.pt/on/demandware.store/Sites-continente-Site/default/Search-UpdateGrid";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const cats = new Map<string, number>();
const hits: string[] = [];
let total: number | null = null, pos = 0;
for (let p = 0; p < maxPages; p++) {
  const res = await fetch(`${BASE}?q=${encodeURIComponent(q)}&start=${p * 24}&sz=24`, { headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9" } });
  if (!res.ok) { console.error(`HTTP ${res.status} on page ${p}`); break; }
  const g = parseGrid(await res.text());
  total = g.total ?? total;
  if (!g.items.length) break;
  for (const it of g.items) {
    pos++;
    const c = it.category ?? "(none)";
    cats.set(c, (cats.get(c) ?? 0) + 1);
    if (show.test(c)) hits.push(`#${pos} (page ${p}) | ${c.split("/").slice(-2).join("/")} | ${it.name} | ${it.packQty} ${it.packUnit} | €${it.price}`);
  }
  if (total !== null && pos >= total) break;
  await new Promise((r) => setTimeout(r, 2000));
}
console.log(`\n"${q}": scanned ${pos} of ${total} results\n\nResults per shop category:`);
for (const [c, n] of [...cats].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(4), c);
console.log(`\nProducts in categories matching /${show.source}/ (position in the results):`);
for (const h of hits) console.log(h);
