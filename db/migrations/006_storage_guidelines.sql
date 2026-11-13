-- 006: storage (shelf-life) guidelines, sourced from USDA FoodKeeper and reviewed by a person.
-- Shelf life is food-safety data: the app only reads rows with review_status = 'approved'.
-- A model (Ollama) may propose the match between an ingredient and a FoodKeeper item, never the number.

-- Raw FoodKeeper rows, kept as published (USDA, CC0). Reference only, not readable from the browser.
create table public.foodkeeper_item (
  id integer primary key,              -- FoodKeeper Product_ID
  name text not null,
  category text,
  keywords text,
  raw jsonb not null                   -- the full source row, untouched
);

create table public.storage_guideline (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredient(id) on delete cascade,
  state text not null default 'raw' check (state in ('raw','cooked','opened','unopened')),
  location text not null check (location in ('pantry','fridge','freezer')),
  min_days integer check (min_days > 0),
  max_days integer check (max_days >= min_days),
  source text not null check (source in ('foodkeeper','manual','model')),
  foodkeeper_item_id integer references public.foodkeeper_item(id),
  note text,
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (ingredient_id, state, location)
);
create index storage_guideline_foodkeeper_idx on public.storage_guideline (foodkeeper_item_id);

alter table public.foodkeeper_item enable row level security;      -- no policies: service role only
alter table public.storage_guideline enable row level security;
create policy "public read approved" on public.storage_guideline
  for select to anon, authenticated using (review_status = 'approved');
