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

**Read `METHODOLOGY.md` first**: free-plan principles (activity, size, batching, no backups, keys), the rule that a model proposes and a person approves food-safety data, and how we change the database.

## Seed data

`db/seed/001_prototype_recipes.sql` loads the prototype's 18 sample meals, their ingredient quantities and 5 prep bases. It is **test data**: quantities and keeping times are placeholders, not food-safety reviewed. Re-running it is safe.

## App connection

`src/integrations/sobra-db/client.ts` is the app's client for this project (publishable key only) and `types.ts` is generated from it. Both are new files; Lovable's `src/integrations/supabase/*` is untouched.

## Rules of the model

- Recipes point to **ingredients**, never to products or promotions. Products point to ingredients.
- A recipe's `fingerprint` is its meal type plus its sorted ingredient slugs, so two meal types may share ingredients but an exact repeat is rejected.
- Quantities are stored in each ingredient's `base_unit` (g, ml or piece).
- A promotion can have several `promotion_window` rows (for example Monday, then Thursday to Sunday).
- Diets and allergens are **computed** from ingredient flags (`recipe_diets`, `recipe_allergen`), never labelled by hand.
- Catalog tables are public read, service-role write. Personal data is owner-only, household data is member-only.
- "Today" in the price views is the Lisbon date.

## Still to do

- Load the FoodKeeper data into `foodkeeper_item`, let Ollama propose ingredient matches, review them, then approve into `storage_guideline`. The prototype's `ingredient.shelf_life_days` values stay placeholders until then. Protein per 100 g is empty.
- Joining a household by invite needs an invite table and a server function (the user cannot read a household they are not in yet). Email delivery needs our own sender (see METHODOLOGY section 4).
- Scrapers and the import step that fill `product`, `product_price`, `flyer`, `promotion`.
- Recipe tags, and many more recipes (generated, then classified). Only the prototype's 18 sample meals are loaded.
- Switch the screens (deals first) from `src/data/*.ts` to the database.
