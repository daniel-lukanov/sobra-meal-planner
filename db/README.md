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

## Rules of the model

- Recipes point to **ingredients**, never to products or promotions. Products point to ingredients.
- Quantities are stored in each ingredient's `base_unit` (g, ml or piece).
- A promotion can have several `promotion_window` rows (for example Monday, then Thursday to Sunday).
- Diets and allergens are **computed** from ingredient flags (`recipe_diets`, `recipe_allergen`), never labelled by hand.
- Catalog tables are public read, service-role write. Personal data is owner-only, household data is member-only.
- "Today" in the price views is the Lisbon date.

## Still to do

- Shelf-life values are placeholders from the prototype and need a food-safety review. Protein per 100 g is empty.
- Joining a household by invite code needs a server function (the user cannot read a household they are not in yet).
- Scrapers and the import step that fill `product`, `product_price`, `flyer`, `promotion`.
- Recipes, prep bases and tags (the prototype's sample meals are not loaded yet).
- Connect the app: project URL and publishable key go into the app's environment, never the service key.
