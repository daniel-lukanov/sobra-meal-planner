-- Accounts with a username, and joining a household by invite link.
--  * sign-up is username + password (+ the person's real email, kept in the auth metadata for later, not verified yet)
--  * the auth address is a placeholder <username>@users.dream-giants.com, so login by username needs no lookup and no email is exposed
--  * every new account still gets a household of its own (handle_new_user); joining an invite moves the person to the inviter's household

alter table public.profile add column username text unique check (username ~ '^[a-z0-9_]{3,20}$');

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare hid uuid; uname text := lower(new.raw_user_meta_data ->> 'username');
begin
  insert into public.profile (id, display_name, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', uname, split_part(new.email, '@', 1)), uname);
  insert into public.household (created_by) values (new.id) returning id into hid;
  insert into public.household_member (household_id, profile_id, role) values (hid, new.id, 'owner');
  return new;
end $$;

-- takes a person out of every household they are in; households left empty are removed, and an owner who leaves hands over to the longest-standing member
create function private.detach_from_households(me uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare old record; was_owner boolean;
begin
  for old in select household_id, role from public.household_member where profile_id = me loop
    was_owner := old.role = 'owner';
    delete from public.household_member where household_id = old.household_id and profile_id = me;
    if not exists (select 1 from public.household_member where household_id = old.household_id) then
      delete from public.household where id = old.household_id;
    elsif was_owner and not exists (select 1 from public.household_member where household_id = old.household_id and role = 'owner') then
      update public.household_member set role = 'owner'
      where household_id = old.household_id
        and profile_id = (select profile_id from public.household_member where household_id = old.household_id order by joined_at limit 1);
    end if;
  end loop;
end $$;
revoke all on function private.detach_from_households(uuid) from public, anon, authenticated;

create function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profile where username = lower(trim(name)))
$$;

-- what the invite page may show before anyone has joined: the household's name and how many people are in it
create function public.household_invite_preview(code text) returns table (name text, members integer)
language sql stable security definer set search_path = '' as $$
  select h.name, (select count(*)::integer from public.household_member m where m.household_id = h.id)
  from public.household h where h.invite_code = lower(trim(code))
$$;

create function public.join_household(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid; me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not signed in'; end if;
  select id into target from public.household where invite_code = lower(trim(code));
  if target is null then raise exception 'unknown invite'; end if;
  if exists (select 1 from public.household_member where household_id = target and profile_id = me) then return target; end if;
  perform private.detach_from_households(me);
  insert into public.household_member (household_id, profile_id, role) values (target, me, 'member');
  return target;
end $$;

create function public.leave_household() returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); hid uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  perform private.detach_from_households(me);
  insert into public.household (created_by) values (me) returning id into hid;
  insert into public.household_member (household_id, profile_id, role) values (hid, me, 'owner');
  return hid;
end $$;

revoke all on function public.username_available(text), public.household_invite_preview(text), public.join_household(text), public.leave_household() from public, anon, authenticated;
grant execute on function public.username_available(text), public.household_invite_preview(text) to anon, authenticated;
grant execute on function public.join_household(text), public.leave_household() to authenticated;
