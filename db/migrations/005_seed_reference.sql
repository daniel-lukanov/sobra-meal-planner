-- Sobra data layer, part 5: reference data.
-- Shelf-life values come from the prototype's sample data and need a food-safety review before launch.
-- Rice and chickpeas have no cooked shelf life on purpose. Protein per 100 g is left empty until filled from a nutrition source.

insert into public.chain (id, name, website, has_online_catalog) values
  ('pingo-doce', 'Pingo Doce', 'https://www.pingodoce.pt', true),
  ('continente', 'Continente', 'https://www.continente.pt', true),
  ('auchan',     'Auchan',     'https://www.auchan.pt',     true),
  ('lidl',       'Lidl',       'https://www.lidl.pt',       false),
  ('aldi',       'Aldi',       'https://www.aldi.pt',       false);

insert into public.allergen (code, name) values
  ('gluten', 'Cereals containing gluten'), ('crustaceans', 'Crustaceans'), ('eggs', 'Eggs'),
  ('fish', 'Fish'), ('peanuts', 'Peanuts'), ('soy', 'Soybeans'), ('milk', 'Milk'),
  ('tree_nuts', 'Tree nuts'), ('celery', 'Celery'), ('mustard', 'Mustard'), ('sesame', 'Sesame'),
  ('sulphites', 'Sulphur dioxide and sulphites'), ('lupin', 'Lupin'), ('molluscs', 'Molluscs');

insert into public.diet (code, name, kind) values
  ('omnivore', 'Eats everything', 'diet'), ('flexitarian', 'Flexitarian', 'diet'),
  ('pescatarian', 'Pescatarian', 'diet'), ('vegetarian', 'Vegetarian', 'diet'), ('vegan', 'Vegan', 'diet'),
  ('no_pork', 'No pork', 'diet'), ('no_beef', 'No beef', 'diet'), ('no_alcohol', 'No alcohol in cooking', 'diet'),
  ('high_protein', 'High protein', 'goal'), ('low_carb', 'Low carb', 'goal'),
  ('budget_first', 'Budget first', 'goal'), ('quick_meals', 'Quick meals', 'goal');

insert into public.meal_type (slug, name) values
  ('tortilla', 'Tortilla'), ('curry', 'Curry'), ('rice-bowls', 'Rice bowls'), ('pasta', 'Pasta'),
  ('roast-chicken', 'Roast chicken'), ('potato-salad', 'Potato salad'), ('stir-fry', 'Stir fry'),
  ('soups', 'Soups'), ('wraps', 'Wraps'), ('omelette', 'Omelette'), ('bacalhau-a-bras', 'Bacalhau à Brás'),
  ('chilli', 'Chilli'), ('salads', 'Salads'), ('gnocchi', 'Gnocchi');

insert into public.ingredient
  (slug, name, category, base_unit, grams_per_piece, shelf_life_days, cooked_shelf_life_days, is_pantry_staple, is_poultry, is_fish, is_egg) values
  ('potatoes',  'Potatoes',     'fruit_veg', 'g',     null, null, 4,    false, false, false, false),
  ('chicken',   'Chicken',      'meat_fish', 'g',     null, null, 4,    false, true,  false, false),
  ('onion',     'Onions',       'fruit_veg', 'g',     150,  30,   null, false, false, false, false),
  ('carrots',   'Carrots',      'fruit_veg', 'g',     null, 28,   null, false, false, false, false),
  ('eggs',      'Eggs',         'eggs_dairy','piece', 60,   28,   null, false, false, false, true),
  ('rice',      'Rice',         'pantry',    'g',     null, null, null, false, false, false, false),
  ('chickpeas', 'Chickpeas',    'pantry',    'g',     null, null, null, false, false, false, false),
  ('peppers',   'Bell peppers', 'fruit_veg', 'g',     null, 10,   null, false, false, false, false),
  ('tuna',      'Canned tuna',  'meat_fish', 'g',     null, null, null, false, false, true,  false),
  ('spinach',   'Spinach',      'fruit_veg', 'g',     null, 5,    null, false, false, false, false),
  ('spaghetti', 'Spaghetti',    'pantry',    'g',     null, null, null, false, false, false, false),
  ('coconut-milk','Coconut milk','pantry',   'ml',    null, null, null, false, false, false, false),
  ('lemon',     'Lemons',       'fruit_veg', 'piece', null, null, null, false, false, false, false),
  ('soy-sauce', 'Soy sauce',    'pantry',    'ml',    null, null, null, true,  false, false, false),
  ('olive-oil', 'Olive oil',    'pantry',    'ml',    null, null, null, true,  false, false, false),
  ('salt',      'Salt',         'pantry',    'g',     null, null, null, true,  false, false, false);

-- cuts of chicken sit under "chicken" so a recipe asking for chicken can use the cheapest cut
insert into public.ingredient (slug, name, parent_id, category, base_unit, cooked_shelf_life_days, is_poultry)
select v.slug, v.name, p.id, 'meat_fish', 'g', 4, true
from (values ('chicken-breast', 'Chicken breast'), ('chicken-thighs', 'Chicken thighs'),
             ('chicken-drumsticks', 'Chicken drumsticks')) v(slug, name)
cross join (select id from public.ingredient where slug = 'chicken') p;

insert into public.ingredient_allergen (ingredient_id, allergen_code)
select i.id, v.code
from (values ('eggs', 'eggs'), ('tuna', 'fish'), ('spaghetti', 'gluten'),
             ('soy-sauce', 'soy'), ('soy-sauce', 'gluten')) v(slug, code)
join public.ingredient i on i.slug = v.slug;
