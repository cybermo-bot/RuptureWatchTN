-- 0003 Organisations and profiles, plus the helpers every access rule uses.
-- Rule: no pharmacy is ever named to another party. An organisation row is readable
-- by its own members only; everyone else gets counts by governorate through functions.

create type public.organisation_type as enum ('pharmacy', 'wholesaler', 'hospital_pharmacy', 'coordinator');
create type public.profile_role as enum ('pharmacist', 'wholesaler', 'hospital_pharmacist', 'coordinator');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  type public.organisation_type not null,
  display_name text not null,
  governorate_code text not null references public.governorates (code),
  origin public.data_origin not null,
  created_at timestamptz not null default now()
);

create index organisations_governorate on public.organisations (governorate_code);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  role public.profile_role not null,
  created_at timestamptz not null default now()
);

create index profiles_organisation on public.profiles (organisation_id);

-- Helpers. security definer so access rules can look up the caller's organisation
-- without recursive row-level checks. They only ever return the caller's own values.
create function app.current_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organisation_id from public.profiles p where p.user_id = (select auth.uid())
$$;

create function app.current_organisation_type()
returns public.organisation_type
language sql
stable
security definer
set search_path = ''
as $$
  select o.type
  from public.profiles p
  join public.organisations o on o.id = p.organisation_id
  where p.user_id = (select auth.uid())
$$;

create function app.current_governorate_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select o.governorate_code
  from public.profiles p
  join public.organisations o on o.id = p.organisation_id
  where p.user_id = (select auth.uid())
$$;

revoke all on function app.current_organisation_id() from public;
revoke all on function app.current_organisation_type() from public;
revoke all on function app.current_governorate_code() from public;
grant execute on function app.current_organisation_id() to authenticated, service_role;
grant execute on function app.current_organisation_type() to authenticated, service_role;
grant execute on function app.current_governorate_code() to authenticated, service_role;

-- Access rules ------------------------------------------------------------------------------
alter table public.organisations enable row level security;
alter table public.profiles enable row level security;

create policy "organisations: members read their own organisation"
  on public.organisations for select
  to authenticated
  using (id = (select app.current_organisation_id()));

create policy "profiles: users read their own profile"
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.organisations from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.organisations to authenticated;
grant select on public.profiles to authenticated;
grant all on public.organisations to service_role;
grant all on public.profiles to service_role;

update public.system_meta set schema_version = 3, updated_at = now();
