// The four pictures of the savings check, drawn with the local image model (mflux), no API key.
//   bun db/scripts/savings-images.ts --dry                  show the prompts
//   bun db/scripts/savings-images.ts                        draw the ones that don't exist yet
//   bun db/scripts/savings-images.ts --only share --redo    draw one again (add --seed 2 for a different take)
//   open public/images/savings/index.html                   look at them
// Prompts are the ones from the brief, word for word. `share` is 1200x630 and is also the OpenGraph preview.
import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1]! : d; };
const SEED0 = Number(opt("seed", "0")); const ONLY = opt("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = new URL("../../public/images/savings/", import.meta.url).pathname;

const TAIL = "Realistic editorial photograph, soft natural daylight, clean light background, calm and minimal, shallow depth of field, no text, no logos, no faces.";
export const IMAGES: Record<string, { prompt: string; w: number; h: number; outW: number; crop?: [number, number] }> = {
  start: { prompt: `A crumpled supermarket receipt on a light kitchen counter next to a reusable tote bag with oranges, bread and a bottle of olive oil. ${TAIL}`, w: 1024, h: 1024, outW: 800 },
  coins: { prompt: `A small stack of euro coins next to a single orange on a white table. ${TAIL}`, w: 1024, h: 1024, outW: 320 },
  list: { prompt: `A handwritten paper shopping list with a pencil next to a few fresh vegetables on a wooden table. ${TAIL}`, w: 1024, h: 1024, outW: 800 },
  share: { prompt: `A reusable shopping bag full of groceries standing on a kitchen table, seen from the side. ${TAIL}`, w: 1200, h: 640, outW: 1200, crop: [630, 1200] },
};

function sheet() {
  const files = readdirSync(OUT).filter((f) => f.endsWith(".jpg")).sort();
  writeFileSync(join(OUT, "index.html"), `<!doctype html><meta charset="utf-8"><title>Savings images</title><style>body{font:14px system-ui;margin:20px;background:#faf8f4}div{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}img{width:100%;border-radius:10px}</style><div>${files.map((f) => `<figure><img src="${f}"><figcaption>${f}</figcaption></figure>`).join("")}</div>`);
}

mkdirSync(OUT, { recursive: true });
const names = Object.keys(IMAGES).filter((s) => (!ONLY.length || ONLY.includes(s)) && (flag("redo") || ONLY.length || !existsSync(join(OUT, `${s}.jpg`))));
console.log(`${names.length} image(s) to draw with mflux${flag("dry") ? " (dry run)" : ""}.`);
for (const s of names) {
  const im = IMAGES[s]!;
  if (flag("dry")) { console.log(`\n${s} (${im.w}x${im.h})\n  ${im.prompt}`); continue; }
  const t0 = Date.now(); const png = join(OUT, `${s}.png`); const jpg = join(OUT, `${s}.jpg`);
  const seed = [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) + SEED0;
  try {
    execFileSync("mflux-generate-z-image-turbo", ["--prompt", im.prompt, "--width", String(im.w), "--height", String(im.h), "--seed", String(seed), "--output", png], { stdio: "inherit" });
    for (const q of [82, 70, 58]) {
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(q), ...(im.crop ? [] : ["--resampleWidth", String(im.outW)]), png, "--out", jpg], { stdio: "ignore" });
      if (im.crop) execFileSync("sips", ["--cropToHeightWidth", String(im.crop[0]), String(im.crop[1]), jpg], { stdio: "ignore" });
      if (statSync(jpg).size < 250_000) break;
    }
    rmSync(png); console.log(`${s} (${Math.round((Date.now() - t0) / 1000)} s)`); sheet();
  } catch (e) { console.error(`FAILED ${s}: ${(e as Error).message}`); }
}
if (!flag("dry")) console.log(`\nLook: open ${join(OUT, "index.html")}\nHappy? Commit public/images/savings/.`);
