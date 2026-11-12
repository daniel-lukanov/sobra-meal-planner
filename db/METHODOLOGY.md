# How we work on the Sobra data layer

Working principles for everyone (and every AI agent) touching `db/`, the scrapers and the imports.
They exist because the database runs on Supabase's free plan and because some of the data is food-safety data.

## 1. Free-plan principles

1. **Keep it active.** A free project pauses after about a week of low database activity. The weekly price import and normal app use count as activity. Before any demo or after a quiet stretch, open the project and check it is not paused. Paused projects can be restored, but not instantly.
2. **Stay small (500 MB cap).** Load only products that map to one of our ingredients, never whole supermarket catalogues. Store a new `product_price` row only when the price changes, not every week.
3. **Push in batches.** Send a few hundred rows per request through the API (default page size is 1,000 rows), never one row at a time. Make every import safe to re-run (upsert on a natural key).
4. **Watch egress (5 GB cap).** Select only the columns a screen needs. Prefer the views (`product_price_today`, recipe cost) to pulling raw tables.
5. **No backups on the free plan.** The raw scraped files, flyer PDFs and the source CSVs stay on the local machine in an unsynced `data/raw/` folder (git-ignored). The database must be rebuildable from `db/migrations/` plus those files. Export the reviewed tables (ingredients, storage guidelines, recipes) to the repo as seed SQL after each review session.
6. **Keys.** The publishable key may sit in app code. The service-role key lives only in a local, git-ignored `.env` used by the import scripts, never in the repo, the browser, or a chat.

## 2. Food-safety data: a model proposes, a person approves

Shelf life and allergens decide what someone eats, so they follow stricter rules than prices:

1. **Numbers come from a source, not from a model.** Shelf-life values come from USDA FoodKeeper (open data, guidelines only, US guidance) or an official local source. We take the conservative end of the range.
2. **A local model (Ollama) may only match.** It proposes which FoodKeeper item an ingredient corresponds to, and may suggest allergen flags. It never writes a number or a flag into a table the app reads.
3. **Everything starts `unreviewed`.** `storage_guideline.review_status` moves to `approved` only after a person checks it. The app reads approved rows only (enforced by row level security).
4. **Always record where a value came from** (`source`, `foodkeeper_item_id`, `reviewed_by`, `reviewed_at`).
5. **Allergens:** the product label scraped from the shop page beats a model guess. Ingredient allergen rows are approved by a person before recipes show allergen information.
6. **When unsure, leave it empty.** A missing shelf life is safe (the app shows nothing). A wrong one is not. Cooked rice, for example, is a case that needs a careful look.

## 3. Changing the database

- Schema changes are numbered files in `db/migrations/`, applied in order, and committed with the change. Do not edit a file that has already been applied; add a new one.
- Lovable owns `supabase/migrations/` and `drizzle/` (the research study). Never put our tables there, and never edit Lovable's generated `src/integrations/supabase/*` files. The app reaches our project through a separate client.
- Every new table gets row level security in the same migration. Run the Supabase security advisor after each migration.
- Work on a branch in the fork and let the repo owner merge; do not rewrite pushed history.

## 4. Email

Lovable's built-in emails work only with Lovable Cloud (and a paid plan). Because our data lives in our own Supabase project, email (invites, sign-up confirmation) is sent through our own sender, for example Resend with a verified domain, set up as custom SMTP in Supabase. Supabase's built-in sender is not for real users.

## 5. Matching scraped products to ingredients

A wrong match is worse than a missing one: it can put a wine or a ready meal into a recipe's price or allergens.

1. **Precision over recall.** Rules start narrow (`include` the name pattern, `exclude` look-alikes). Missing a product only costs a price option; a wrong one corrupts costs and allergen data.
2. **Check what was kept and what was dropped** after every new rule: list both, not just the matches.
3. **Same unit and same form.** A product only counts for an ingredient if it can be priced in the ingredient's unit (grams, millilitres or pieces) and is the same form (cooked and dried chickpeas, fresh and frozen, whole and processed are different ingredients).
4. **Sanity-check prices per kg or per litre** per ingredient. Outliers usually mean a parsing or matching error.
5. **Rule matches are provisional** (`mapping_source = 'rule'`). Allergen-relevant matches need a person's approval (section 2) before the app relies on them.
