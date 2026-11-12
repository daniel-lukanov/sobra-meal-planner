-- Sobra data layer, part 3: people and what they own.
-- Per user: diet, allergies, favourite meal types, stores. Per household: fridge, plans, lists, receipts.

create table public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  cooking_mode text not null default 'prep' check (cooking_mode in ('prep','daily')),
  created_at timestamptz not null default now()
);

create table public.profile_diet (
  profile_id uuid not null references public.profile(id) on delete cascade,
  diet_code text not null references public.diet(code),
  primary key (profile_id, diet_code)
);
create table public.profile_allergen (
  profile_id uuid not null references public.profile(id) on delete cascade,
  allergen_code text not null references public.allergen(code),
  primary key (profile_id, allergen_code)
);
create table public.profile_excluded_ingredient (
  profile_id uuid not null references public.profile(id) on delete cascade,
  ingredient_id uuid not null references public.ingredient(id) on delete cascade,
  primary key (profile_id, ingredient_id)
);
create table public.profile_meal_type (          -- the "favourite meals" picked at setup
  profile_id uuid not null references public.profile(id) on delete cascade,
  meal_type_slug text not null references public.meal_type(slug),
  primary key (profile_id, meal_type_slug)
);
create table public.profile_chain (              -- stores the user shops in (multi-select)
  profile_id uuid not null references public.profile(id) on delete cascade,
  chain_id text not null references public.chain(id),
  primary key (profile_id, chain_id)
);
create index on public.profile_diet (diet_code);
create index on public.profile_allergen (allergen_code);
create index on public.profile_excluded_ingredient (ingredient_id);
create index on public.profile_meal_type (meal_type_slug);
create index on public.profile_chain (chain_id);

-- ---------- households ----------
create table public.household (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  portions integer not null default 2 check (portions between 1 and 12),
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_by uuid references public.profile(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.household (created_by);

create table public.household_member (
  household_id uuid not null references public.household(id) on delete cascade,
  profile_id uuid not null references public.profile(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);
create index on public.household_member (profile_id);

-- ---------- fridge and receipts ----------
create table public.fridge_item (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  ingredient_id uuid not null references public.ingredient(id),
  product_id uuid references public.product(id) on delete set null,
  label text,                                  -- "Cooked chicken (from Sunday)"
  quantity numeric check (quantity >= 0),      -- in ingredient.base_unit
  state text not null default 'raw' check (state in ('raw','cooked')),
  source text not null default 'manual' check (source in ('receipt','manual','prep','plan')),
  added_on date not null default current_date,
  expires_on date,
  created_at timestamptz not null default now()
);
create index on public.fridge_item (household_id, expires_on);
create index on public.fridge_item (ingredient_id);
create index on public.fridge_item (product_id);

create table public.receipt (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  chain_id text references public.chain(id),
  purchased_on date,
  total numeric(8,2),
  created_by uuid references public.profile(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.receipt (household_id);
create index on public.receipt (chain_id);
create index on public.receipt (created_by);

create table public.receipt_line (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipt(id) on delete cascade,
  raw_text text not null,                      -- "GRAO BICO 3X400G"
  price numeric(8,2),
  product_id uuid references public.product(id) on delete set null,
  ingredient_id uuid references public.ingredient(id) on delete set null,
  confirmed boolean not null default false
);
create index on public.receipt_line (receipt_id);
create index on public.receipt_line (product_id);
create index on public.receipt_line (ingredient_id);

-- ---------- weekly plan and shopping list ----------
create table public.week_plan (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  week_start date not null,
  mode text not null default 'prep' check (mode in ('prep','daily')),
  status text not null default 'draft' check (status in ('draft','accepted')),
  accepted_at timestamptz,
  created_by uuid references public.profile(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, week_start)
);
create index on public.week_plan (created_by);

create table public.plan_meal (
  id uuid primary key default gen_random_uuid(),
  week_plan_id uuid not null references public.week_plan(id) on delete cascade,
  day date not null,
  recipe_id uuid not null references public.recipe(id),
  portions integer not null default 2 check (portions > 0),
  unique (week_plan_id, day)
);
create index on public.plan_meal (recipe_id);

create table public.shopping_list_item (
  id uuid primary key default gen_random_uuid(),
  week_plan_id uuid not null references public.week_plan(id) on delete cascade,
  ingredient_id uuid not null references public.ingredient(id),
  product_id uuid references public.product(id) on delete set null,  -- the pack chosen
  quantity_needed numeric not null check (quantity_needed >= 0),     -- in base_unit
  packs integer not null default 1 check (packs >= 0),
  in_fridge boolean not null default false,
  checked boolean not null default false,
  unique (week_plan_id, ingredient_id)
);
create index on public.shopping_list_item (ingredient_id);
create index on public.shopping_list_item (product_id);

-- ---------- alerts and the north-star metric ----------
create table public.price_alert (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id) on delete cascade,
  ingredient_id uuid not null references public.ingredient(id) on delete cascade,
  target_price numeric(8,2),                   -- null = tell me about any real deal
  active boolean not null default true,
  unique (profile_id, ingredient_id)
);
create index on public.price_alert (ingredient_id);

create table public.cook_log (                  -- "meals cooked through to the final step"
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household(id) on delete cascade,
  profile_id uuid references public.profile(id) on delete set null,
  recipe_id uuid not null references public.recipe(id),
  plan_meal_id uuid references public.plan_meal(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz                     -- set only when the final step is done
);
create index on public.cook_log (household_id, completed_at);
create index on public.cook_log (profile_id);
create index on public.cook_log (recipe_id);
create index on public.cook_log (plan_meal_id);
