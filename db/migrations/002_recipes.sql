-- Sobra data layer, part 2: recipes, prep bases, tags.
-- Recipes reference ingredients, never products or promotions, so they outlive weekly prices.
-- Quantities are always stored in the ingredient's base_unit (g, ml or piece).

-- a component cooked once and reused for several dinners (roast chicken, boiled potatoes, cooked rice)
create table public.prep_base (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  ingredient_id uuid references public.ingredient(id) on delete set null,
  method text,
  keeps_days integer not null default 3 check (keeps_days > 0),
  minutes integer check (minutes > 0),
  steps jsonb not null default '[]'
);
create index on public.prep_base (ingredient_id);

create table public.recipe (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  meal_type text not null references public.meal_type(slug),
  summary text,
  how text,                                   -- one line: "Reheat in the pan, 10 min"
  minutes integer check (minutes > 0),
  servings integer not null default 2 check (servings > 0),
  steps_relaxed jsonb not null default '[]',  -- [{text, timer, meanwhile}]
  steps_fast jsonb not null default '[]',
  image_url text,
  source text not null default 'curated' check (source in ('curated','generated')),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  fingerprint text unique,                    -- sorted ingredient set, stops near-duplicates
  created_at timestamptz not null default now()
);
create index on public.recipe (meal_type);
create index on public.recipe (status);

create table public.recipe_ingredient (
  recipe_id uuid not null references public.recipe(id) on delete cascade,
  ingredient_id uuid not null references public.ingredient(id),
  quantity numeric not null check (quantity > 0),   -- per recipe, in ingredient.base_unit
  is_optional boolean not null default false,
  note text,
  primary key (recipe_id, ingredient_id)
);
create index on public.recipe_ingredient (ingredient_id);

create table public.recipe_prep_base (
  recipe_id uuid not null references public.recipe(id) on delete cascade,
  prep_base_id uuid not null references public.prep_base(id),
  primary key (recipe_id, prep_base_id)
);
create index on public.recipe_prep_base (prep_base_id);

-- soft taste and style labels (spicy, comfort, light, quick, budget...). Ranking only, never safety.
create table public.recipe_tag (
  recipe_id uuid not null references public.recipe(id) on delete cascade,
  tag text not null,
  primary key (recipe_id, tag)
);
create index on public.recipe_tag (tag);
