// One-off: downloads every image the app needs into public/images/ so nothing depends on Lovable's media storage
// (the /__l5e/ URLs only work inside Lovable) or on Unsplash being reachable. Run on your own machine, then commit public/images.
//   bun scripts/localize-images.ts [--origin https://<your-lovable-preview-domain>]
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";

const arg = (n: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const assets = JSON.parse(readFileSync("src/assets/continente.png.asset.json", "utf8"));
const origin = (arg("--origin") ?? `https://id-preview--${assets.project_id}.lovable.app`).replace(/\/$/, "");
mkdirSync("public/images/stores", { recursive: true }); mkdirSync("public/images/photos", { recursive: true });

let failed = 0;
async function save(url: string, file: string) {
  if (existsSync(file)) { console.log("have ", file); return; }
  try {
    const res = await fetch(url);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) throw new Error(`HTTP ${res.status} ${type}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer())); console.log("saved", file);
  } catch (e) { failed++; console.log("FAILED", file, "<-", url, String(e)); }
}

// store logos: pointer files in src/assets/*.asset.json carry the path on Lovable's media storage
for (const [slug, f] of [["pingo-doce", "pingo_doce"], ["continente", "continente"], ["lidl", "lidl"], ["aldi", "aldi"], ["auchan", "auchan"]] as const) {
  const a = JSON.parse(readFileSync(`src/assets/${f}.png.asset.json`, "utf8"));
  await save(origin + a.url, `public/images/stores/${slug}.png`);
}
// photos: every Unsplash id used in src/data/photos.ts
const src = readFileSync("src/data/photos.ts", "utf8");
for (const id of new Set([...src.matchAll(/\b(?:u|ing)\("([0-9a-z-]+)"\)/g)].map((m) => m[1]))) {
  await save(`https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop&q=80`, `public/images/photos/${id}.jpg`);
}
console.log(failed ? `\n${failed} failed. For logos pass --origin with your Lovable preview address; a missing Unsplash photo needs a replacement id in src/data/photos.ts.` : "\nAll images saved. Commit public/images.");
