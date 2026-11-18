-- 014: survey registry + completion records (device id and account, never an IP address), and a cuisine label per recipe.

-- 1. Surveys we can push, with a version, so a changed survey is asked again and a new one can follow.
create table if not exists public.survey (
  id text not null,
  version int not null,
  title text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (id, version)
);
insert into public.survey (id, version, title) values ('survey-1', 2, 'First-visit survey (stores, fallback dinners, pains, workarounds)')
  on conflict do nothing;
alter table public.survey enable row level security;
drop policy if exists survey_public_read on public.survey;
create policy survey_public_read on public.survey for select using (true);

-- 2. Who finished which survey. Matched by a random device id kept in the browser, and by account once someone logs in.
--    'self_reported_not_matched' = the visitor said they already did it but we found no record.
create table if not exists public.survey_completion (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null,
  survey_version int not null,
  device_id uuid not null,
  session_id uuid,
  user_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('completed', 'self_reported_not_matched')),
  created_at timestamptz not null default now(),
  foreign key (survey_id, survey_version) references public.survey (id, version),
  unique (device_id, survey_id, survey_version)
);
create index if not exists survey_completion_user on public.survey_completion (user_id);
alter table public.survey_completion enable row level security;
-- No policies on purpose: the app only reaches this table through the two functions below.

create or replace function public.survey_register(p_device uuid, p_session uuid, p_status text, p_survey text default 'survey-1', p_version int default 2)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('completed', 'self_reported_not_matched') then raise exception 'bad status'; end if;
  insert into public.survey_completion (survey_id, survey_version, device_id, session_id, user_id, status)
  values (p_survey, p_version, p_device, p_session, auth.uid(), p_status)
  on conflict (device_id, survey_id, survey_version) do update
    set user_id = coalesce(excluded.user_id, public.survey_completion.user_id),
        status = case when public.survey_completion.status = 'completed' then 'completed' else excluded.status end;
end $$;

-- True when this device, or the logged-in account, finished the survey. A logged-in check also links the device's record to the account.
create or replace function public.survey_check(p_device uuid, p_survey text default 'survey-1', p_version int default 2)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); found boolean;
begin
  if uid is not null then
    update public.survey_completion set user_id = uid
      where device_id = p_device and survey_id = p_survey and survey_version = p_version and status = 'completed' and user_id is null;
  end if;
  select exists (
    select 1 from public.survey_completion
    where survey_id = p_survey and survey_version = p_version and status = 'completed'
      and (device_id = p_device or (uid is not null and user_id = uid))
  ) into found;
  return found;
end $$;
grant execute on function public.survey_register(uuid, uuid, text, text, int) to anon, authenticated;
grant execute on function public.survey_check(uuid, text, int) to anon, authenticated;

-- 3. Cuisine label per recipe (proposed labels, to be reviewed by a person).
alter table public.recipe add column if not exists cuisine text;
update public.recipe r set cuisine = v.c from (values
  ('carrot-chickpea-lemon-salad','Mediterranean'),('carrot-chickpea-soup','Portuguese'),('carrot-coconut-soup','Asian'),
  ('chicken-pepper-stir-fry','Asian'),('chicken-potato-hash','Portuguese'),('chicken-potato-traybake','Portuguese'),
  ('chicken-spinach-rice','Portuguese'),('chicken-fried-rice','Asian'),('chicken-chickpea-pepper-stew','Portuguese'),
  ('chicken-rice-carrot-soup','Portuguese'),('chickpea-egg-skillet','Mediterranean'),('chickpea-spinach-stew','Portuguese'),
  ('chickpea-curry-rice','Indian'),('coconut-chicken-curry','Indian'),('coconut-chickpea-curry','Indian'),
  ('coconut-lemon-rice-spinach','Asian'),('egg-lemon-rice-soup','Mediterranean'),('garlic-spinach-spaghetti','Italian'),
  ('lemon-chicken-chickpea-salad','Mediterranean'),('lemon-chicken-spaghetti','Italian'),('lemon-chicken-rice','Mediterranean'),
  ('paprika-chicken-potatoes-peppers','Portuguese'),('pasta-roast-pepper-sauce','Italian'),('pepper-fried-rice','Asian'),
  ('pepper-onion-eggs','Mediterranean'),('potato-carrot-soup','Portuguese'),('potato-chickpea-curry','Indian'),
  ('potato-egg-salad','Portuguese'),('potato-egg-skillet','Spanish'),('potato-salad-tuna','Portuguese'),
  ('rice-bowl-pepper-egg','Asian'),('roast-carrot-pepper-rice-bowl','Mediterranean'),('roast-potatoes-chicken','Portuguese'),
  ('smoky-chickpea-pepper-stew','Spanish'),('chickpea-chilli-rice','Mexican'),('spanish-tortilla','Spanish'),
  ('spinach-egg-fried-rice','Asian'),('spinach-potato-tortilla','Spanish'),('spinach-omelette','Mediterranean'),
  ('stuffed-peppers-rice','Mediterranean'),('tuna-chickpea-salad','Mediterranean'),('tuna-pepper-spaghetti','Italian'),
  ('tuna-fried-rice','Asian'),('tuna-pasta-lemon','Italian'),('tuna-lemon-rice-bowl','Asian'),
  ('tuna-chickpea-spinach-stew','Portuguese'),('tuna-egg-potato-salad','Portuguese'),('warm-potato-pepper-salad','Mediterranean')
) as v(slug, c) where r.slug = v.slug;
