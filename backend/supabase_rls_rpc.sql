begin;

create schema if not exists app_private;

create or replace function app_private.current_user_row_id_int()
returns integer
language sql
stable
as $$
  select u.id
  from public."User" u
  where u.auth_user_id = auth.uid()::text
  limit 1
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_row_id_int() to authenticated;

create unique index if not exists friend_owner_friend_unique
on public."Friend" (owner_user_id, friend_user_id);

create or replace function public.search_friend_candidates(search_name text)
returns table (
  id integer,
  name text,
  user_id text,
  note text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.name, u.user_id, u.note
  from public."User" u
  where u.name = search_name
    and u.auth_user_id is not null
    and u.id <> app_private.current_user_row_id_int()
  order by u.id asc
  limit 20
$$;

create or replace function public.find_friend_candidate_by_public_user_id(search_public_user_id text)
returns table (
  id integer,
  name text,
  user_id text,
  note text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.name, u.user_id, u.note
  from public."User" u
  where u.user_id = search_public_user_id
    and u.auth_user_id is not null
    and u.id <> app_private.current_user_row_id_int()
  limit 1
$$;

create or replace function public.find_friend_candidate_by_db_id(search_user_db_id integer)
returns table (
  id integer,
  name text,
  user_id text,
  note text,
  icon_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.name, u.user_id, u.note, u.icon_url
  from public."User" u
  where u.id = search_user_db_id
    and u.auth_user_id is not null
    and u.id <> app_private.current_user_row_id_int()
  limit 1
$$;

create or replace function public.create_friend_pair(target_friend_user_id integer)
returns table (
  id integer,
  owner_user_id integer,
  friend_user_id integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id integer;
begin
  current_user_id := app_private.current_user_row_id_int();

  if current_user_id is null then
    raise exception 'Current user row was not found';
  end if;

  if current_user_id = target_friend_user_id then
    raise exception 'You cannot add yourself';
  end if;

  insert into public."Friend" (owner_user_id, friend_user_id)
  values (current_user_id, target_friend_user_id)
  on conflict (owner_user_id, friend_user_id) do nothing;

  insert into public."Friend" (owner_user_id, friend_user_id)
  values (target_friend_user_id, current_user_id)
  on conflict (owner_user_id, friend_user_id) do nothing;

  return query
  select f.id, f.owner_user_id, f.friend_user_id, f.created_at, f.updated_at
  from public."Friend" f
  where f.owner_user_id = current_user_id
    and f.friend_user_id = target_friend_user_id
  limit 1;
end;
$$;

grant execute on function public.search_friend_candidates(text) to authenticated;
grant execute on function public.find_friend_candidate_by_public_user_id(text) to authenticated;
grant execute on function public.find_friend_candidate_by_db_id(integer) to authenticated;
grant execute on function public.create_friend_pair(integer) to authenticated;

commit;
