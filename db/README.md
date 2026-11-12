# Sobra data layer (own Supabase project)

SQL for the Supabase project that holds products, prices, promotions, recipes, users, households,
fridge, plans and receipts. It lives in `db/` on purpose: Lovable owns `supabase/migrations/` and
`drizzle/` for the research study on Lovable Cloud, and the two must not mix.

Run the files in order (they are already applied to project `pjwepyjcahvascttlarc`, Frankfurt):

| File | What it does |
| --- | --- |
| `001_catalog.sql` | chains, allergens, diets, meal types, ingredients, products, regular prices, flyers, promotions and their date windows |
| `002_recipes.sql` | recipes, recipe ingredients, prep bases (cook-once components), tags |
| `003_users_households.sql` | profile, diet/allergy/store/meal-type choices, households, fridge, receipts, weekly plans, shopping list, price alerts, cook log |
| `004_security_and_views.sql` | row level security, signup trigger, and the views for today's prices, recipe cost, diets and allergens |
| `005_seed_reference.sql` | chains, the 14 EU allergens, diets, 14 meal types, starter ingredients |
| `006_storage_guidelines.sql` | USDA FoodKeeper rows and per-ingredient storage guidelines with a review status (the app reads approved rows only) |
| `007_net_weight.sql` | usable (net) weight: `ingredient.usable_fraction`, `product.usable_qty` with `usable_source`; `product_price_today` prices per usable unit |

**Read `METHODOLOGY.md` first**: free-plan principles (activity, size, batching, no backups, keys), the rule that a model proposes and a person approves food-safety data, and how we change the database.

## Seed data

`db/seed/001_prototype_recipes.sql` loads the prototype's 18 sample meals, their ingredient quantities and 5 prep bases. It is **test data**: quantities and keeping times are placeholders, not food-safety reviewed. Re-running it is safe.

## App connection

`src/integrations/sobra-db/client.ts` is the app's client for this project (publishable key only) and `types.ts` is generated from it. Both are new files; Lovable's `src/integrations/supabase/*` is untouched.

## Scripts (run on your own machine with Bun)

- `scripts/probe-continente.sh` saves a few raw Continente pages to `data/raw/` (git-ignored) so parsers can be written against real markup.
- `scripts/continente.ts` fetches search results for the ingredient queries, maps products to ingredients by simple name rules (`mapping_source = 'rule'`, to be reviewed), and saves products, regular prices (a new row only on change) and strike-through promotions. It is a **dry run unless you pass `--write`**. Items sold by weight are stored with the price of the whole pack (loose produce is priced per 1 kg). A product is kept only if its shop category path matches the rule's category and its name matches `include`. `--pages` is a maximum (default 8): paging stops after two pages in a row with no kept product (relevance order is not strict). `scripts/audit-search.ts` is a read-only check that scans every result page of one search term and shows the shop categories and the products in the categories you name. Usable weight comes from the label, then from a rule (e.g. tuna 70 %, bone-in chicken 65 %), and is never overwritten when set manually. `--try-cgid <id>` probes whether the grid accepts a category id (unverified). The shop tile has no promotion end date, so a promotion window runs from the day it was seen to `--hold-days` (default 3) later and is extended whenever it is seen again.

## Rules of the model

- Recipes point to **ingredients**, never to products or promotions. Products point to ingredients.
- A recipe's `fingerprint` is its meal type plus its sorted ingredient slugs, so two meal types may share ingredients but an exact repeat is rejected.
- Quantities are stored in each ingredient's `base_unit` (g, ml or piece).
- A promotion can have several `promotion_window` rows (for example Monday, then Thursday to Sunday).
- Diets and allergens are **computed** from ingredient flags (`recipe_diets`, `recipe_allergen`), never labelled by hand.
- Catalog tables are public read, service-role write. Personal data is owner-only, household data is member-only.
- "Today" in the price views is the Lisbon date.

## Still to do

- Check the placeholder usable fractions (tuna 0.7, bone-in chicken 0.65) against labels; chickpeas are left unadjusted.
- Load the FoodKeeper data into `foodkeeper_item`, let Ollama propose ingredient matches, review them, then approve into `storage_guideline`. The prototype's `ingredient.shelf_life_days` values stay placeholders until then. Protein per 100 g is empty.
- Joining a household by invite needs an invite table and a server function (the user cannot read a household they are not in yet). Email delivery needs our own sender (see METHODOLOGY section 4).
- Scrapers and the import step that fill `product`, `product_price`, `flyer`, `promotion`.
- Recipe tags, and many more recipes (generated, then classified). Only the prototype's 18 sample meals are loaded.
- Switch the screens (deals first) from `src/data/*.ts` to the database.
