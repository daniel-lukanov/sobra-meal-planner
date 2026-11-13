// Loads the generated recipes (db/seed/recipes.ts) into the Sobra database. Run with Bun:
//   bun db/scripts/seed-recipes.ts --dry     check the data and print what would be written (writes nothing)
//   bun db/scripts/seed-recipes.ts           write: new staples, 30 recipes, their ingredients, tags and prep-base links,
//                                            and steps, tags and a summary for the 18 prototype recipes
// Safe to re-run (everything is an upsert by slug). Needs db/.env (SUPABASE_URL, SUPABASE_SECRET_KEY); the key is never printed.

import { readFileSync, existsSync } from "node:fs";
import { BACKFILL, NEW_STAPLES, RECIPES } from "../seed/recipes";

function loadEnv(): { url: string; key: string } {
  const f = new URL("../.env", import.meta.url).pathname;
  if (!existsSync(f)) throw new Error("db/.env not found.");
  const env: Record<string, string> = {};
  for (const line of readFileSync(f, "utf8").split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]!] = m[2]!.trim(); }
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("db/.env needs SUPABASE_URL and SUPABASE_SECRET_KEY");
  return { url: env.SUPABASE_URL.replace(/\/+$/, ""), key: env.SUPABASE_SECRET_KEY };
}
const env = loadEnv();
async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const res = await fetch(`${env.url}/rest/v1/${path}`, { ...init, headers: { apikey: env.key, "Content-Type": "application/json", ...(init.prefer ? { Prefer: init.prefer } : {}), ...(init.headers as object) } });
  if (!res.ok) throw new Error(`DB ${res.status} on ${path.split("?")[0]}: ${(await res.text()).slice(0, 400)}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}
const upsert = (table: string, conflict: string, rows: object[], select = "") =>
  rest(`${table}?on_conflict=${conflict}${select ? `&select=${select}` : ""}`, { method: "POST", body: JSON.stringify(rows), prefer: `resolution=merge-duplicates,return=${select ? "representation" : "minimal"}` });

async function main() {
  const dry = process.argv.includes("--dry");
  const ings: { id: string; slug: string; parent_id: string | null }[] = await rest("ingredient?select=id,slug,parent_id");
  const known = new Set([...ings.map((i) => i.slug), ...NEW_STAPLES.map((s) => s.slug)]);
  const bad = RECIPES.flatMap((r) => Object.keys(r.ing).filter((s) => !known.has(s)).map((s) => `${r.slug}: ${s}`));
  if (bad.length) throw new Error(`Unknown ingredients: ${bad.join(", ")}`);
  console.log(`${RECIPES.length} new recipes, ${NEW_STAPLES.length} staples, ${BACKFILL.length} prototype recipes to complete. ${dry ? "(dry run)" : ""}`);
  if (dry) return;

  // 1) pantry staples (left out of costs and shopping lists)
  await upsert("ingredient", "slug", NEW_STAPLES.map((s) => ({ slug: s.slug, name: s.name, name_pt: s.name_pt, category: "pantry", base_unit: s.base_unit,
    ...(s.grams_per_piece ? { grams_per_piece: s.grams_per_piece } : {}), is_pantry_staple: true })));
  const all: { id: string; slug: string; parent_id: string | null }[] = await rest("ingredient?select=id,slug,parent_id");
  const idOf = new Map(all.map((i) => [i.slug, i.id])); const byId = new Map(all.map((i) => [i.id, i]));
  console.log(`staples ok (${NEW_STAPLES.map((s) => s.slug).join(", ")})`);

  // 2) recipes (published, source generated)
  const fp = (r: (typeof RECIPES)[number]) => `${r.type}:${Object.keys(r.ing).sort().join(",")}`;
  const rows: { id: string; slug: string }[] = await upsert("recipe", "slug", RECIPES.map((r) => ({ slug: r.slug, title: r.title, meal_type: r.type, summary: r.summary, how: r.how,
    minutes: r.minutes, servings: 2, steps_relaxed: r.relaxed, steps_fast: r.fast, source: "generated", status: "published", fingerprint: fp(r) })), "id,slug");
  const rid = new Map(rows.map((r) => [r.slug, r.id]));

  // 3) ingredients, tags
  await upsert("recipe_ingredient", "recipe_id,ingredient_id", RECIPES.flatMap((r) => Object.entries(r.ing).map(([slug, quantity]) =>
    ({ recipe_id: rid.get(r.slug)!, ingredient_id: idOf.get(slug)!, quantity }))));
  await upsert("recipe_tag", "recipe_id,tag", RECIPES.flatMap((r) => r.tags.map((tag) => ({ recipe_id: rid.get(r.slug)!, tag }))));

  // 4) the 18 prototype recipes: steps, tags and a summary (their ingredients stay as they are)
  const old: { id: string; slug: string }[] = await rest(`recipe?select=id,slug&slug=in.(${BACKFILL.map((b) => b.slug).join(",")})`);
  const oid = new Map(old.map((r) => [r.slug, r.id]));
  for (const b of BACKFILL) {
    if (!oid.has(b.slug)) { console.log(`  skipped ${b.slug}: not in the database`); continue; }
    await rest(`recipe?id=eq.${oid.get(b.slug)}`, { method: "PATCH", body: JSON.stringify({ summary: b.summary, steps_relaxed: b.relaxed, steps_fast: b.fast }) });
  }
  await upsert("recipe_tag", "recipe_id,tag", BACKFILL.filter((b) => oid.has(b.slug)).flatMap((b) => b.tags.map((tag) => ({ recipe_id: oid.get(b.slug)!, tag }))));

  // 5) prep bases: link a recipe to the bases for the ingredients it uses (a child such as chicken thighs counts for its parent)
  const preps: { id: string; ingredient_id: string | null }[] = await rest("prep_base?select=id,ingredient_id");
  const links = new Set<string>(); const linkRows: { recipe_id: string; prep_base_id: string }[] = [];
  for (const r of RECIPES) for (const slug of Object.keys(r.ing)) {
    const ing = byId.get(idOf.get(slug)!)!;
    for (const p of preps) if (p.ingredient_id && (p.ingredient_id === ing.id || p.ingredient_id === ing.parent_id)) {
      const k = `${rid.get(r.slug)}|${p.id}`; if (!links.has(k)) { links.add(k); linkRows.push({ recipe_id: rid.get(r.slug)!, prep_base_id: p.id }); }
    }
  }
  await upsert("recipe_prep_base", "recipe_id,prep_base_id", linkRows);
  console.log(`done: ${rows.length} recipes, ${RECIPES.reduce((n, r) => n + Object.keys(r.ing).length, 0)} ingredient lines, ${linkRows.length} prep-base links, ${BACKFILL.length} prototype recipes completed.`);
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
