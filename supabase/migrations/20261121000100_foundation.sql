-- 0001 Foundation: extensions, helper schema, origin type, system metadata.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Helper functions used by access rules and search. Not exposed through the API.
create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- Every observation row says where it comes from. The interface shows it as a badge.
create type public.data_origin as enum ('official_source', 'tester', 'simulated');

-- Accent-, case- and spacing-insensitive form used by search.
-- Declared immutable so it can feed generated columns and indexes; the unaccent
-- dictionary is named explicitly so the result does not depend on search_path.
create function app.normalize(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, value)),
    '\s+', ' ', 'g'
  ))
$$;

grant execute on function app.normalize(text) to anon, authenticated, service_role;

-- One row. schema_version is raised by every migration; /api/health reads it.
create table public.system_meta (
  id boolean primary key default true check (id),
  schema_version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_meta enable row level security;

create policy "system_meta: anyone can read"
  on public.system_meta for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.system_meta from anon, authenticated;

insert into public.system_meta (schema_version) values (1);
