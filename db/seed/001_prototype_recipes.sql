-- Seed: the prototype's sample meals as recipes, plus prep bases (cook-once components).
-- TEST DATA. Quantities (for 2 servings, in each ingredient's base unit) and prep-base keeping times are
-- placeholders written for testing, not food-safety reviewed. Recipe fingerprint = meal_type + sorted ingredient slugs.
-- Safe to re-run: it skips recipes that already exist.

insert into public.prep_base (slug, name, ingredient_id, keeps_days, minutes)
select v.slug, v.name, i.id, v.keeps, v.mins
from (values
  ('boiled-potatoes', 'Boiled potatoes',  'potatoes',  3, 25),
  ('roast-chicken',   'Roast chicken',    'chicken',   3, 45),
  ('cooked-rice',     'Cooked rice',      'rice',      1, 15),
  ('roast-peppers',   'Roast peppers',    'peppers',   3, 30),
  ('chickpea-base',   'Chickpea base',    'chickpeas', 3, 15)
) v(slug, name, ing, keeps, mins)
join public.ingredient i on i.slug = v.ing
on conflict (slug) do nothing;

with r(slug, title, meal_type, how, minutes) as (values
  ('roast-potatoes-chicken','Roast potatoes with chicken','roast-chicken','Reheat in the pan, 10 min',10),
  ('chicken-potato-hash','Chicken and potato hash','stir-fry','Crisp it all in one pan, 12 min',12),
  ('potato-salad-tuna','Potato salad with tuna','potato-salad','New dressing, red onion, 10 min',10),
  ('potato-carrot-soup','Potato and carrot soup','soups','Blend with stock, 15 min',15),
  ('spanish-tortilla','Spanish tortilla','tortilla','Last potatoes with eggs, 15 min',15),
  ('potato-egg-skillet','Potato and egg skillet','omelette','Fry, crack the eggs on top, 12 min',12),
  ('chickpea-curry-rice','Chickpea curry with rice','curry','Heat the base, add spinach, 12 min',12),
  ('chickpea-spinach-stew','Chickpea and spinach stew','soups','Simmer the base with spinach, 12 min',12),
  ('rice-bowl-pepper-egg','Rice bowl with roast peppers and egg','rice-bowls','Fry an egg, assemble, 10 min',10),
  ('pepper-fried-rice','Pepper fried rice','stir-fry','Stir fry with an egg, 10 min',10),
  ('pasta-roast-pepper-sauce','Pasta with roast pepper sauce','pasta','Blend the peppers, 15 min',15),
  ('stuffed-peppers-rice','Stuffed peppers with rice','rice-bowls','Fill and bake, 20 min',20),
  ('chicken-fried-rice','Chicken fried rice','stir-fry','Stir fry with an egg, 12 min',12),
  ('tuna-chickpea-salad','Tuna and chickpea salad','salads','Mix, dress, 8 min',8),
  ('carrot-chickpea-soup','Carrot and chickpea soup','soups','Blend with stock, 15 min',15),
  ('spinach-omelette','Spinach omelette','omelette','Wilt, add eggs, 10 min',10),
  ('chicken-spinach-rice','Chicken and spinach rice','rice-bowls','Rice, chicken and spinach, 22 min',22),
  ('tuna-pasta-lemon','Tuna pasta with lemon','pasta','Boil, toss with tuna and lemon, 15 min',15)
)
insert into public.recipe (slug, title, meal_type, how, minutes, status, source)
select slug, title, meal_type, how, minutes, 'published', 'curated' from r
on conflict (slug) do nothing;

with q(recipe, ing, qty) as (values
  ('roast-potatoes-chicken','potatoes',500),('roast-potatoes-chicken','chicken',300),('roast-potatoes-chicken','carrots',200),
  ('chicken-potato-hash','potatoes',400),('chicken-potato-hash','chicken',250),('chicken-potato-hash','onion',150),
  ('potato-salad-tuna','potatoes',500),('potato-salad-tuna','onion',75),('potato-salad-tuna','tuna',160),
  ('potato-carrot-soup','potatoes',400),('potato-carrot-soup','carrots',300),('potato-carrot-soup','onion',150),
  ('spanish-tortilla','potatoes',500),('spanish-tortilla','eggs',5),('spanish-tortilla','onion',150),
  ('potato-egg-skillet','potatoes',400),('potato-egg-skillet','eggs',4),('potato-egg-skillet','onion',75),
  ('chickpea-curry-rice','chickpeas',480),('chickpea-curry-rice','rice',150),('chickpea-curry-rice','spinach',150),
  ('chickpea-spinach-stew','chickpeas',480),('chickpea-spinach-stew','spinach',150),('chickpea-spinach-stew','onion',150),
  ('rice-bowl-pepper-egg','rice',150),('rice-bowl-pepper-egg','peppers',200),('rice-bowl-pepper-egg','eggs',2),
  ('pepper-fried-rice','rice',150),('pepper-fried-rice','peppers',150),('pepper-fried-rice','eggs',2),
  ('pasta-roast-pepper-sauce','peppers',300),('pasta-roast-pepper-sauce','onion',75),('pasta-roast-pepper-sauce','spaghetti',200),
  ('stuffed-peppers-rice','peppers',400),('stuffed-peppers-rice','rice',150),('stuffed-peppers-rice','onion',75),
  ('chicken-fried-rice','chicken',250),('chicken-fried-rice','rice',150),('chicken-fried-rice','eggs',2),
  ('tuna-chickpea-salad','tuna',160),('tuna-chickpea-salad','chickpeas',240),('tuna-chickpea-salad','onion',50),
  ('carrot-chickpea-soup','carrots',400),('carrot-chickpea-soup','chickpeas',240),('carrot-chickpea-soup','onion',150),
  ('spinach-omelette','eggs',4),('spinach-omelette','spinach',100),('spinach-omelette','onion',50),
  ('chicken-spinach-rice','rice',150),('chicken-spinach-rice','chicken',200),('chicken-spinach-rice','spinach',150),('chicken-spinach-rice','soy-sauce',15),
  ('tuna-pasta-lemon','spaghetti',200),('tuna-pasta-lemon','tuna',160),('tuna-pasta-lemon','onion',50),('tuna-pasta-lemon','lemon',1),('tuna-pasta-lemon','olive-oil',15)
)
insert into public.recipe_ingredient (recipe_id, ingredient_id, quantity)
select r.id, i.id, q.qty from q
join public.recipe r on r.slug = q.recipe
join public.ingredient i on i.slug = q.ing
on conflict do nothing;

update public.recipe r set fingerprint = r.meal_type || ':' || (
  select string_agg(i.slug, ',' order by i.slug)
  from public.recipe_ingredient ri join public.ingredient i on i.id = ri.ingredient_id
  where ri.recipe_id = r.id)
where r.fingerprint is null;

-- steps for the one meal the prototype's cook mode walks through
update public.recipe set
  steps_relaxed = '[{"text":"Put the rice on with 2 cups of water and a pinch of salt.","timer":720,"meanwhile":"While it cooks, slice the chicken. You have 12 minutes."},{"text":"Slice the chicken into thin strips and season with salt and paprika."},{"text":"Fry the chicken over high heat until golden.","timer":360,"meanwhile":"Meanwhile, wash the spinach."},{"text":"Add the spinach and a splash of soy sauce. Stir for one minute.","timer":60},{"text":"Serve the chicken and spinach over the rice."}]'::jsonb,
  steps_fast = '[{"text":"Microwave the rice pouch and fry the chicken strips at the same time.","timer":360,"meanwhile":"One pan, one bowl. Done in 8 minutes."},{"text":"Add the spinach and soy sauce, stir 1 min, serve over the rice.","timer":60}]'::jsonb
where slug = 'chicken-spinach-rice';

-- link each recipe to the prep bases for the ingredients it uses
insert into public.recipe_prep_base (recipe_id, prep_base_id)
select distinct ri.recipe_id, pb.id
from public.recipe_ingredient ri join public.prep_base pb on pb.ingredient_id = ri.ingredient_id
on conflict do nothing;
