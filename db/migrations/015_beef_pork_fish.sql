-- 015: beef, pork and white fish, so the recipe set is not only chicken, tuna and vegetarian.
-- Flags drive diets (no pork, no beef, pescatarian) and allergens through the recipe_* views.
insert into public.ingredient
  (slug, name, name_pt, category, base_unit, shelf_life_days, cooked_shelf_life_days, is_pantry_staple, is_beef, is_pork, is_fish)
values
  ('beef-mince', 'Beef mince',      'Carne picada de vaca', 'meat_fish', 'g', 2, 3, false, true,  false, false),
  ('pork-loin',  'Pork loin',       'Lombo de porco',       'meat_fish', 'g', 3, 3, false, false, true,  false),
  ('hake',       'Hake (white fish)', 'Pescada',            'meat_fish', 'g', 2, 2, false, false, false, true)
on conflict (slug) do nothing;

-- canned chopped tomatoes: a pantry staple, left out of costs and shopping lists like the spices
insert into public.ingredient (slug, name, name_pt, category, base_unit, is_pantry_staple)
values ('canned-tomato', 'Canned tomatoes', 'Tomate pelado', 'pantry', 'g', true)
on conflict (slug) do nothing;

insert into public.ingredient_allergen (ingredient_id, allergen_code)
select id, 'fish' from public.ingredient where slug = 'hake'
on conflict do nothing;
