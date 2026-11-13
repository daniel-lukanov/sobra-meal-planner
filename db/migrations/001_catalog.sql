-- Sobra data layer, part 1: reference data, ingredients, products, prices, promotions.
-- Lives in db/ on purpose: Lovable owns supabase/migrations and drizzle/.

create schema if not exists private;

-- ---------- reference tables ----------
create table public.chain (
  id text primary key,                       -- 'pingo-doce'
  name text not null,
  website text,
  has_online_catalog boolean not null default false,  -- regular prices available online
  active boolean not null default true
);

create table public.allergen (                -- the 14 EU mandatory allergens
  code text primary key,
  name text not null
);

create table public.diet (
  code text primary key,
  name text not null,
  kind text not null check (kind in ('diet', 'goal'))  -- diets filter, goals only rank
);

create table public.meal_type (
  slug text primary key,
  name text not null
);

-- ---------- ingredients ----------
create table public.ingredient (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.ingredient(id) on delete set null,  -- chicken > chicken thighs
  category text not null check (category in
    ('fruit_veg','meat_fish','eggs_dairy','pantry','frozen','bakery','drinks','other')),
  base_unit text not null check (base_unit in ('g','ml','piece')),
  grams_per_piece numeric check (grams_per_piece > 0),   -- "2 eggs" -> grams
  shelf_life_days integer check (shelf_life_days > 0),   -- raw, in the fridge
  cooked_shelf_life_days integer check (cooked_shelf_life_days > 0),
  is_pantry_staple boolean not null default false,       -- salt, oil, spices
  protein_g_per_100 numeric check (protein_g_per_100 >= 0),
  -- diet flags: diets are computed from these, never labelled by hand
  is_pork boolean not null default false,
  is_beef boolean not null default false,
  is_poultry boolean not null default false,
  is_other_meat boolean not null default false,
  is_fish boolean not null default false,
  is_shellfish boolean not null default false,
  is_dairy boolean not null default false,
  is_egg boolean not null default false,
  is_honey boolean not null default false,
  is_gelatine boolean not null default false,
  is_alcohol boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.ingredient (parent_id);

create table public.ingredient_allergen (
  ingredient_id uuid not null references public.ingredient(id) on delete cascade,
  allergen_code text not null references public.allergen(code),
  primary key (ingredient_id, allergen_code)
);
create index on public.ingredient_allergen (allergen_code);

-- ---------- products (what a chain actually sells) ----------
create table public.product (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null references public.chain(id),
  external_id text not null,                 -- chain SKU, or a hash of the flyer name
  name text not null,
  brand text,
  ean text,
  pack_qty numeric not null check (pack_qty > 0),           -- in pack_unit
  pack_unit text not null check (pack_unit in ('g','ml','piece')),
  url text,
  ingredient_id uuid references public.ingredient(id) on delete set null,
  mapping_source text check (mapping_source in ('manual','ai','rule')),
  receipt_aliases text[] not null default '{}',   -- e.g. 'GRAO BICO 3X400G'
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (chain_id, external_id)
);
create index on public.product (ingredient_id);
create index on public.product (ean) where ean is not null;

-- regular (non-promo) price, a new row only when the price changes
create table public.product_price (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product(id) on delete cascade,
  price numeric(8,2) not null check (price >= 0),
  valid_from date not null,
  valid_to date,                              -- null = still current
  source text not null check (source in ('online','flyer','receipt','manual')),
  observed_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);
create index on public.product_price (product_id, valid_from desc);

-- ---------- flyers and promotions ----------
create table public.flyer (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null references public.chain(id),
  valid_from date not null,
  valid_to date not null,
  source_url text,
  fetched_at timestamptz not null default now(),
  check (valid_to >= valid_from),
  unique (chain_id, valid_from, source_url)
);
create index on public.flyer (chain_id);

create table public.promotion (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product(id) on delete cascade,
  flyer_id uuid references public.flyer(id) on delete set null,
  promo_price numeric(8,2) not null check (promo_price >= 0),  -- effective price per pack
  regular_price numeric(8,2),                                   -- price printed as "was", if any
  deal_type text not null default 'price_cut' check (deal_type in
    ('price_cut','percent_off','multibuy','card_only','min_spend','other')),
  deal_text text,                                               -- "2nd unit -50%"
  requires_loyalty_card boolean not null default false,
  source text not null check (source in ('online','flyer','manual')),
  source_url text,
  created_at timestamptz not null default now()
);
create index on public.promotion (product_id);
create index on public.promotion (flyer_id);

-- one promotion can be active on several separate periods (Mon, then Thu-Sun)
create table public.promotion_window (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotion(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on)
);
create index on public.promotion_window (promotion_id);
create index on public.promotion_window (starts_on, ends_on);
