-- 017: savings check pivot. ADDITIVE ONLY: one new table and two functions. No existing table, column or row is touched.
-- Snapshot of a shared savings result, so /s/[id] can show it to a friend. Reached only through the two functions below.

create table if not exists public.shared_results (
  id uuid primary key default gen_random_uuid(),
  sharer_session_id uuid,
  store text not null check (char_length(store) <= 40),
  saving numeric(8,2) not null check (saving >= 0 and saving <= 10000),
  cheapest_store text not null check (char_length(cheapest_store) <= 40),
  created_at timestamptz not null default now()
);
alter table public.shared_results enable row level security;
-- No policies on purpose: anonymous visitors reach this table only through the two functions.

create or replace function public.share_result_create(p_session uuid, p_store text, p_saving numeric, p_cheapest text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.shared_results (sharer_session_id, store, saving, cheapest_store)
  values (p_session, left(p_store, 40), round(p_saving, 2), left(p_cheapest, 40))
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.share_result_get(p_id uuid)
returns table (store text, saving numeric, cheapest_store text) language sql security definer set search_path = public as $$
  select store, saving, cheapest_store from public.shared_results where id = p_id;
$$;

revoke all on function public.share_result_create(uuid, text, numeric, text) from public;
revoke all on function public.share_result_get(uuid) from public;
grant execute on function public.share_result_create(uuid, text, numeric, text) to anon, authenticated;
grant execute on function public.share_result_get(uuid) to anon, authenticated;
