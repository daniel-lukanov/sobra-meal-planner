-- The fridge, receipts, accepted week and list ticks become household data that every member sees (and changes) live.
--  * fridge items remember their receipt (removing a receipt removes its items) and how long the product keeps
--  * the chosen dinners, the accepted flag and the list ticks live in one row per household for now
--    (week_plan / plan_meal / shopping_list_item stay for the server-side planner later)
--  * Realtime is switched on for these tables; it respects the same row level security

alter table public.fridge_item
  add column shelf_days integer check (shelf_days > 0),
  add column receipt_id uuid references public.receipt(id) on delete cascade;
create index on public.fridge_item (receipt_id);

create table public.household_plan_state (
  household_id uuid primary key references public.household(id) on delete cascade,
  chosen jsonb not null default '{}',            -- day row -> dinner title picked through Swap
  accepted boolean not null default false,
  checked jsonb not null default '{}',           -- shopping list item slug -> ticked
  updated_by uuid references public.profile(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.household_plan_state (updated_by);

alter table public.household_plan_state enable row level security;
create policy "household members" on public.household_plan_state for all to authenticated
  using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));

alter publication supabase_realtime add table public.fridge_item, public.receipt, public.household_plan_state;
