-- 0025 Pilot-2 item 3: « Un problème ? Une idée ? ». A short message from a pharmacy (signed in)
-- or from an anonymous visitor, read by the team lead in the Supabase dashboard only.
--
-- No visitor identifier is stored: no device hash (it would link feedback to patient requests),
-- no address, no user id. The organisation is kept for a signed-in caller only, to rate-limit it
-- and to know which pilot pharmacy met a problem. The path is a route pattern: the server
-- replaces ids by [id] and drops the query, and the database refuses anything else.
-- Rate limits without an identifier: 5 per hour per organisation when signed in, and a global
-- cap of 200 per hour for all anonymous visitors together.
-- Origin: the organisation's own origin when signed in (as for reports), `tester` for an
-- anonymous visitor (a real person trying the prototype). Never `official_source`.

create type public.feedback_rating as enum ('easy', 'unclear', 'broken');

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null check (length(path) <= 200 and path ~ '^/(([a-z_-]+|\[id\])(/([a-z_-]+|\[id\]))*)?$'),
  organisation_id uuid references public.organisations (id) on delete set null,
  rating public.feedback_rating,
  message text not null check (length(message) between 1 and 1000 and btrim(message) <> ''),
  origin public.data_origin not null check (origin <> 'official_source')
);

create index feedback_recent on public.feedback (created_at desc);
create index feedback_organisation_recent on public.feedback (organisation_id, created_at desc);

-- Row-level security on, and no policy: nobody reads or writes the table through the API but
-- the service role. Inserts go through submit_feedback below.
alter table public.feedback enable row level security;

revoke all on public.feedback from anon, authenticated;
grant all on public.feedback to service_role;

create function public.submit_feedback(p_path text, p_rating public.feedback_rating, p_message text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  org uuid := app.current_organisation_id();
  org_origin public.data_origin;
  clean_message text := btrim(coalesce(p_message, ''));
  recent integer;
  new_id uuid;
begin
  if clean_message = '' or length(clean_message) > 1000 then
    raise exception 'submit_feedback: a message of 1 to 1000 characters' using errcode = '22023';
  end if;
  if p_path is null or length(p_path) > 200 or p_path !~ '^/(([a-z_-]+|\[id\])(/([a-z_-]+|\[id\]))*)?$' then
    raise exception 'submit_feedback: a route pattern, ids replaced by [id]' using errcode = '22023';
  end if;

  -- One caller at a time per limit, so two parallel messages cannot both pass the count.
  perform pg_advisory_xact_lock(hashtextextended('feedback:' || coalesce(org::text, 'anonymous'), 0));
  if org is not null then
    select count(*) into recent
    from public.feedback f
    where f.organisation_id = org and f.created_at > now() - interval '1 hour';
    if recent >= 5 then
      raise exception 'submit_feedback: 5 messages per hour per organisation' using errcode = 'RW429';
    end if;
    select o.origin into org_origin from public.organisations o where o.id = org;
  else
    select count(*) into recent
    from public.feedback f
    where f.organisation_id is null and f.created_at > now() - interval '1 hour';
    if recent >= 200 then
      raise exception 'submit_feedback: 200 anonymous messages per hour' using errcode = 'RW429';
    end if;
  end if;

  insert into public.feedback (path, organisation_id, rating, message, origin)
  values (p_path, org, p_rating, clean_message, coalesce(nullif(org_origin, 'official_source'), 'tester'))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_feedback(text, public.feedback_rating, text) from public;
grant execute on function public.submit_feedback(text, public.feedback_rating, text) to anon, authenticated, service_role;

update public.system_meta set schema_version = 25, updated_at = now();
