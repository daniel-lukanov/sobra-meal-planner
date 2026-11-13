-- Sobra data layer, part 4: access rules (RLS), signup trigger, derived views.
--  * catalog data (ingredients, products, prices, promos, recipes) is readable by everyone, writable only by the service role
--  * personal data is readable only by its owner; household data only by household members
--  * helper functions live in the "private" schema so the API does not expose them

-- ---------- helpers ----------
create function private.is_household_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_member m
    where m.household_id = hid and m.profile_id = (select auth.uid())
  )
$$;

create function private.is_household_owner(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_member m
    where m.household_id = hid and m.profile_id = (select auth.uid()) and m.role = 'owner'
  )
$$;

create function private.shares_household(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_member a
    join public.household_member b on b.household_id = a.household_id
    where a.profile_id = (select auth.uid()) and b.profile_id = pid
  )
$$;

grant usage on schema private to authenticated;
revoke all on function private.is_household_member(uuid), private.is_household_owner(uuid), private.shares_household(uuid) from public, anon;
grant execute on function private.is_household_member(uuid), private.is_household_owner(uuid), private.shares_household(uuid) to authenticated;

-- a new sign-up gets a profile and a household of their own
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare hid uuid;
begin
  insert into public.profile (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  insert into public.household (created_by) values (new.id) returning id into hid;
  insert into public.household_member (household_id, profile_id, role) values (hid, new.id, 'owner');
  return new;
end $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- ---------- catalog: public read, no public write ----------
do $$
declare t text;
begin
  foreach t in array array['chain','allergen','diet','meal_type','ingredient','ingredient_allergen',
    'product','product_price','flyer','promotion','promotion_window','prep_base',
    'recipe_ingredient','recipe_prep_base','recipe_tag'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

alter table public.recipe enable row level security;
create policy "public read published" on public.recipe for select to anon, authenticated using (status = 'published');

-- ---------- own data only ----------
do $$
declare t text;
begin
  foreach t in array array['profile_meal_type','profile_chain','price_alert'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
      using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()))', t);
  end loop;
end $$;

-- diet, allergies and exclusions are also visible to housemates (the plan must suit everyone)
do $$
declare t text;
begin
  foreach t in array array['profile_diet','profile_allergen','profile_excluded_ingredient'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own or housemate read" on public.%I for select to authenticated
      using (profile_id = (select auth.uid()) or private.shares_household(profile_id))', t);
    execute format('create policy "own insert" on public.%I for insert to authenticated
      with check (profile_id = (select auth.uid()))', t);
    execute format('create policy "own delete" on public.%I for delete to authenticated
      using (profile_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.profile enable row level security;
create policy "own or housemate read" on public.profile for select to authenticated
  using (id = (select auth.uid()) or private.shares_household(id));
create policy "own insert" on public.profile for insert to authenticated with check (id = (select auth.uid()));
create policy "own update" on public.profile for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- households ----------
alter table public.household enable row level security;
create policy "member read" on public.household for select to authenticated
  using (private.is_household_member(id) or created_by = (select auth.uid()));
create policy "creator insert" on public.household for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "member update" on public.household for update to authenticated
  using (private.is_household_member(id)) with check (private.is_household_member(id));
create policy "owner delete" on public.household for delete to authenticated
  using (private.is_household_owner(id));

alter table public.household_member enable row level security;
create policy "member read" on public.household_member for select to authenticated
  using (private.is_household_member(household_id));
create policy "creator adds self" on public.household_member for insert to authenticated
  with check (profile_id = (select auth.uid())
    and exists (select 1 from public.household h where h.id = household_id and h.created_by = (select auth.uid())));
create policy "owner updates" on public.household_member for update to authenticated
  using (private.is_household_owner(household_id)) with check (private.is_household_owner(household_id));
create policy "leave or owner removes" on public.household_member for delete to authenticated
  using (profile_id = (select auth.uid()) or private.is_household_owner(household_id));

-- ---------- household-scoped data ----------
do $$
declare t text;
begin
  foreach t in array array['fridge_item','receipt','week_plan','cook_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "household members" on public.%I for all to authenticated
      using (private.is_household_member(household_id)) with check (private.is_household_member(household_id))', t);
  end loop;
end $$;

alter table public.receipt_line enable row level security;
create policy "household members" on public.receipt_line for all to authenticated
  using (exists (select 1 from public.receipt r where r.id = receipt_id and private.is_household_member(r.household_id)))
  with check (exists (select 1 from public.receipt r where r.id = receipt_id and private.is_household_member(r.household_id)));

alter table public.plan_meal enable row level security;
create policy "household members" on public.plan_meal for all to authenticated
  using (exists (select 1 from public.week_plan w where w.id = week_plan_id and private.is_household_member(w.household_id)))
  with check (exists (select 1 from public.week_plan w where w.id = week_plan_id and private.is_household_member(w.household_id)));

alter table public.shopping_list_item enable row level security;
create policy "household members" on public.shopping_list_item for all to authenticated
  using (exists (select 1 from public.week_plan w where w.id = week_plan_id and private.is_household_member(w.household_id)))
  with check (exists (select 1 from public.week_plan w where w.id = week_plan_id and private.is_household_member(w.household_id)));

-- ---------- views: what things cost today (Lisbon date) ----------
create view public.product_price_today with (security_invoker = true) as
select
  p.id as product_id, p.chain_id, p.ingredient_id, p.name, p.pack_qty, p.pack_unit,
  rp.price as regular_price,
  pr.promo_price,
  pr.requires_loyalty_card,
  pr.deal_text,
  pr.ends_on as promo_ends_on,
  coalesce(pr.promo_price, rp.price) as effective_price,
  coalesce(pr.promo_price, rp.price) / p.pack_qty as price_per_base_unit
from public.product p
left join lateral (
  select x.price from public.product_price x
  where x.product_id = p.id
    and x.valid_from <= (now() at time zone 'Europe/Lisbon')::date
    and (x.valid_to is null or x.valid_to >= (now() at time zone 'Europe/Lisbon')::date)
  order by x.valid_from desc limit 1
) rp on true
left join lateral (
  select q.promo_price, q.requires_loyalty_card, q.deal_text, w.ends_on
  from public.promotion q
  join public.promotion_window w on w.promotion_id = q.id
  where q.product_id = p.id
    and w.starts_on <= (now() at time zone 'Europe/Lisbon')::date
    and w.ends_on >= (now() at time zone 'Europe/Lisbon')::date
  order by q.promo_price limit 1
) pr on true
where p.active and coalesce(pr.promo_price, rp.price) is not null;

-- cheapest product per ingredient and chain; a product also counts for its parent ingredient
-- (chicken thighs also answers "chicken"). Only products whose pack unit matches the ingredient's base unit.
create view public.ingredient_price_today with (security_invoker = true) as
with base as (
  select t.*, i.parent_id
  from public.product_price_today t
  join public.ingredient i on i.id = t.ingredient_id
  where t.pack_unit = i.base_unit
), rolled as (
  select ingredient_id, chain_id, product_id, effective_price, promo_price, price_per_base_unit from base
  union all
  select parent_id, chain_id, product_id, effective_price, promo_price, price_per_base_unit
  from base where parent_id is not null
)
select distinct on (ingredient_id, chain_id)
  ingredient_id, chain_id, product_id, effective_price, promo_price,
  promo_price is not null as on_promo, price_per_base_unit
from rolled
order by ingredient_id, chain_id, price_per_base_unit;

create view public.ingredient_best_price_today with (security_invoker = true) as
select distinct on (ingredient_id) *
from public.ingredient_price_today
order by ingredient_id, price_per_base_unit;

-- cost of a recipe at today's cheapest prices across all chains (pantry staples excluded)
create view public.recipe_cost_today with (security_invoker = true) as
select
  r.id as recipe_id,
  r.servings,
  sum(ri.quantity * b.price_per_base_unit) filter (where not i.is_pantry_staple) as cost_total,
  round(sum(ri.quantity * b.price_per_base_unit) filter (where not i.is_pantry_staple) / r.servings, 2) as cost_per_serving,
  count(*) filter (where not i.is_pantry_staple) as ingredients_counted,
  count(b.ingredient_id) filter (where not i.is_pantry_staple) as ingredients_priced,
  count(*) filter (where b.on_promo and not i.is_pantry_staple) as ingredients_on_promo
from public.recipe r
join public.recipe_ingredient ri on ri.recipe_id = r.id
join public.ingredient i on i.id = ri.ingredient_id
left join public.ingredient_best_price_today b on b.ingredient_id = ri.ingredient_id
group by r.id, r.servings;

-- ---------- views: diets and allergens computed from ingredient flags ----------
create view public.recipe_diet_flags with (security_invoker = true) as
select
  r.id as recipe_id,
  coalesce(bool_or(i.is_pork), false) as has_pork,
  coalesce(bool_or(i.is_beef), false) as has_beef,
  coalesce(bool_or(i.is_poultry), false) as has_poultry,
  coalesce(bool_or(i.is_other_meat), false) as has_other_meat,
  coalesce(bool_or(i.is_fish), false) as has_fish,
  coalesce(bool_or(i.is_shellfish), false) as has_shellfish,
  coalesce(bool_or(i.is_dairy), false) as has_dairy,
  coalesce(bool_or(i.is_egg), false) as has_egg,
  coalesce(bool_or(i.is_honey), false) as has_honey,
  coalesce(bool_or(i.is_gelatine), false) as has_gelatine,
  coalesce(bool_or(i.is_alcohol), false) as has_alcohol
from public.recipe r
left join public.recipe_ingredient ri on ri.recipe_id = r.id
left join public.ingredient i on i.id = ri.ingredient_id
group by r.id;

create view public.recipe_diets with (security_invoker = true) as
select
  recipe_id,
  not (has_pork or has_beef or has_poultry or has_other_meat or has_fish or has_shellfish or has_gelatine
       or has_dairy or has_egg or has_honey) as is_vegan,
  not (has_pork or has_beef or has_poultry or has_other_meat or has_fish or has_shellfish or has_gelatine) as is_vegetarian,
  not (has_pork or has_beef or has_poultry or has_other_meat or has_gelatine) as is_pescatarian,
  not has_pork as is_no_pork,
  not has_beef as is_no_beef,
  not has_alcohol as is_no_alcohol
from public.recipe_diet_flags;

create view public.recipe_allergen with (security_invoker = true) as
select distinct ri.recipe_id, ia.allergen_code
from public.recipe_ingredient ri
join public.ingredient_allergen ia on ia.ingredient_id = ri.ingredient_id;
