-- Food settings follow the person across devices, and the household's stores and "I have it" marks follow the household.
--  * profile_prefs: one row per person (diet, proteins, allergens, goals, cooking mode, favourite meal types).
--    Housemates can read each other's row, so the shared plan can use the strictest diet and every allergy of the household.
--  * household_plan_state gains the stores the household shops at and the ingredients it marked as at home.

create table public.profile_prefs (
  profile_id uuid primary key references public.profile(id) on delete cascade,
  lifestyle text not null default 'none' check (lifestyle in ('none','vegetarian','vegan')),
  proteins text[] not null default '{}',      -- animal proteins the person eats (poultry, beef, pork, other_meat, fish, shellfish)
  allergens text[] not null default '{}',     -- the 14 EU allergens plus lactose
  goals text[] not null default '{}',         -- high_protein, budget, light, quick
  cooking_mode text not null default 'prep' check (cooking_mode in ('prep','daily')),
  meals text[] not null default '{}',         -- favourite meal types
  updated_at timestamptz not null default now()
);

alter table public.profile_prefs enable row level security;
create policy "own or housemate read" on public.profile_prefs for select to authenticated
  using (profile_id = (select auth.uid()) or private.shares_household(profile_id));
create policy "own insert" on public.profile_prefs for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "own update" on public.profile_prefs for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "own delete" on public.profile_prefs for delete to authenticated
  using (profile_id = (select auth.uid()));

alter table public.household_plan_state
  add column stores text[] not null default '{}',
  add column have text[] not null default '{}';

alter publication supabase_realtime add table public.profile_prefs;
