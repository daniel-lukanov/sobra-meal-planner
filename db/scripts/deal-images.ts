// Photos for the ingredients that deal cards have no picture for yet. Run with Bun on your Mac:
//   bun db/scripts/deal-images.ts --dry              print the prompts only
//   bun db/scripts/deal-images.ts                    draw every missing image into public/images/deals/<slug>.jpg
//   bun db/scripts/deal-images.ts --only olive-oil --redo     draw one again (add --seed 2 for a different take)
//   open public/images/deals/index.html              look at them; delete a .jpg you don't like and rerun
// Providers: --provider openai (default; needs OPENAI_API_KEY in db/.env) or mflux (local, free). Same options as recipe-images.ts.
// The images are small files committed to the repo and served from /images/deals/ (no database or bucket needed).
// One look for all: a single product on a plain light surface, so they read as a set next to the existing ingredient photos.

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ENV: Record<string, string> = {};
const envFile = new URL("../.env", import.meta.url).pathname;
if (existsSync(envFile)) for (const l of readFileSync(envFile, "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) ENV[m[1]!] = m[2]!.trim(); }

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1]! : d; };
const PROVIDER = opt("provider", "openai"); const MODEL = opt("model", PROVIDER === "mflux" ? "z-image-turbo" : "gpt-image-1");
const SEED0 = Number(opt("seed", "0")); const ONLY = opt("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = new URL("../../public/images/deals/", import.meta.url).pathname;
const W = 800;

const STYLE = "Professional food photography, natural window light from the left, warm natural colours, shallow depth of field, simple light wooden table, soft neutral background, no text, no labels, no logos, no brand names, no people.";
export const ITEMS: Record<string, string> = {
  "olive-oil": `A clear glass bottle of golden-green extra virgin olive oil with a plain unlabelled cork stopper, next to a small white bowl of olive oil with a sprig of rosemary and two green olives. ${STYLE}`,
  spaghetti: `A neat bundle of dry spaghetti tied loosely, with a few strands fanned out on a light wooden table, and a small nest of cooked spaghetti on a white plate in the background. ${STYLE}`,
  "coconut-milk": `A halved coconut, a small white bowl of creamy white coconut milk and a glass jug of coconut milk, no packaging. ${STYLE}`,
  "soy-sauce": `A small white ceramic dish of dark soy sauce with a pair of chopsticks resting beside it and a small plain glass bottle of soy sauce, no label. ${STYLE}`,
  lemon: `Three whole bright yellow lemons with green leaves and one lemon cut in half showing its juicy segments, on a light wooden table. ${STYLE}`,
};

async function generate(prompt: string, seed: number): Promise<Buffer> {
  if (PROVIDER === "openai") {
    const key = ENV.OPENAI_API_KEY; if (!key) throw new Error("Add OPENAI_API_KEY=... to db/.env (a line of its own), then rerun.");
    const r = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, prompt, size: "1024x1024", quality: "medium", n: 1 }) });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const d = ((await r.json()) as { data?: { b64_json?: string; url?: string }[] }).data?.[0];
    if (d?.b64_json) return Buffer.from(d.b64_json, "base64");
    if (d?.url) return Buffer.from(await (await fetch(d.url)).arrayBuffer());
    throw new Error("OpenAI returned no image.");
  }
  const tmp = join(OUT, `_tmp-${seed}.png`); const native = MODEL === "z-image-turbo";
  const a = [...(native ? [] : ["--model", MODEL]), "--prompt", prompt, "--width", "1024", "--height", "1024", "--seed", String(seed), "--output", tmp];
  execFileSync(native ? "mflux-generate-z-image-turbo" : "mflux-generate", a, { stdio: "inherit" });
  const b = readFileSync(tmp); rmSync(tmp); return b;
}

function sheet() {
  const files = readdirSync(OUT).filter((f) => f.endsWith(".jpg")).sort();
  writeFileSync(join(OUT, "index.html"), `<!doctype html><meta charset="utf-8"><title>Deal images</title><style>body{font:14px system-ui;margin:20px;background:#faf8f4}div{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}img{width:100%;border-radius:10px}</style><div>${files.map((f) => `<figure><img src="${f}"><figcaption>${f}</figcaption></figure>`).join("")}</div>`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const slugs = Object.keys(ITEMS).filter((s) => (!ONLY.length || ONLY.includes(s)) && (flag("redo") || ONLY.length || !existsSync(join(OUT, `${s}.jpg`))));
  console.log(`${slugs.length} image(s) to draw with ${PROVIDER}/${MODEL}${flag("dry") ? " (dry run)" : ""}.`);
  for (const s of slugs) {
    if (flag("dry")) { console.log(`\n${s}\n  ${ITEMS[s]}`); continue; }
    const t0 = Date.now(); const png = join(OUT, `${s}.png`); const jpg = join(OUT, `${s}.jpg`);
    try {
      writeFileSync(png, await generate(ITEMS[s]!, [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) + SEED0));
      for (const q of [82, 70, 58]) { execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(q), "--resampleWidth", String(W), png, "--out", jpg], { stdio: "ignore" }); if (statSync(jpg).size < 250_000) break; }
      rmSync(png); console.log(`${s} (${Math.round((Date.now() - t0) / 1000)} s)`); sheet();
    } catch (e) { console.error(`FAILED ${s}: ${(e as Error).message}`); }
  }
  if (!flag("dry")) console.log(`\nLook: open ${join(OUT, "index.html")}\nHappy? Commit public/images/deals/.`);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
