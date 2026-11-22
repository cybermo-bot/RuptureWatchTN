-- 0010 Shared foundations: availability requests from anonymous patients, and the answers
-- of participating pharmacies. Schema and access only; tracks B and D build the screens.
--
-- Contract (docs/CONTRIBUTING.md):
--   create_availability_request(...)   server only (service role), after hashing the device id
--   requests_for_my_pharmacy()         a pharmacy's open requests in its governorate
--   insert into availability_answers   a pharmacy answers a request routed to it
--   request_answers_public(request_id) anyone: pharmacies that said yes and chose to show themselves
--   demand_by_governorate(...)         coordinators, wholesalers, hospital pharmacies: counts only
--
-- A request stores the molecule, an optional presentation, a governorate, an optional
-- delegation, the time, and a salted hash of a random id kept on the visitor's device, used
-- only to refuse a second request for the same molecule within 24 hours. Never a name, a
-- phone number or coordinates. Requests never change a level.

-- Small counts, as everywhere: 0 stays 0, 1 and 2 read '<3' (lib/signal displayCount).
create function app.display_count(n bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when n = 0 then '0' when n < 3 then '<3' else n::text end
$$;

revoke all on function app.display_count(bigint) from public;
grant execute on function app.display_count(bigint) to authenticated, service_role;

-- Where a participating pharmacy is, for the patient map. Shown to a patient only when the
-- pharmacy chooses so in an answer (request_answers_public). Demo pharmacies get fictional
-- coordinates from supabase/seed/demo-organisations.json; their origin stays simulated.
alter table public.organisations
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  add column public_address text check (char_length(public_address) <= 200),
  add constraint organisations_position_complete check ((latitude is null) = (longitude is null));

create type public.availability_answer as enum ('available', 'unavailable');

create table public.availability_requests (
  id uuid primary key default gen_random_uuid(),
  molecule_id uuid not null references public.molecules (id) on delete restrict,
  medicine_id uuid references public.medicines (id) on delete restrict,
  governorate_code text not null references public.governorates (code),
  delegation text check (char_length(delegation) between 1 and 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  origin public.data_origin not null,
  constraint availability_requests_three_hours check (expires_at = created_at + interval '3 hours')
);

create index availability_requests_open on public.availability_requests (governorate_code, expires_at);
create index availability_requests_device on public.availability_requests (device_hash, molecule_id, created_at);
create index availability_requests_molecule on public.availability_requests (molecule_id, created_at);

create table public.availability_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.availability_requests (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  answer public.availability_answer not null,
  show_identity boolean not null default false,
  answered_at timestamptz not null default now(),
  origin public.data_origin not null,
  unique (request_id, organisation_id)
);

create index availability_answers_organisation on public.availability_answers (organisation_id);

-- Whether a request is routed to the caller: the caller is a pharmacy in the request's
-- governorate, and the request is still open. security definer because pharmacies cannot
-- read availability_requests.
create function app.request_routed_to_me(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.availability_requests r
    where r.id = p_request_id
      and r.expires_at > now()
      and (select app.current_organisation_type()) = 'pharmacy'
      and r.governorate_code = (select app.current_governorate_code())
  )
$$;

revoke all on function app.request_routed_to_me(uuid) from public;
grant execute on function app.request_routed_to_me(uuid) to authenticated, service_role;

-- Access rules ------------------------------------------------------------------------------
alter table public.availability_requests enable row level security;
alter table public.availability_answers enable row level security;

-- availability_requests: no policy for anon or authenticated, so no direct read or write.
-- Requests are created by create_availability_request (service role) and read through the
-- functions below, which never return device_hash.

create policy "availability_answers: pharmacy reads its own answers"
  on public.availability_answers for select
  to authenticated
  using (organisation_id = (select app.current_organisation_id()));

create policy "availability_answers: pharmacy answers a request routed to it"
  on public.availability_answers for insert
  to authenticated
  with check (
    organisation_id = (select app.current_organisation_id())
    and origin = (select app.current_organisation_origin())
    and (select app.request_routed_to_me(request_id))
  );

revoke all on public.availability_requests from anon, authenticated;
revoke all on public.availability_answers from anon, authenticated;
grant all on public.availability_requests to service_role;
grant all on public.availability_answers to service_role;
grant select on public.availability_answers to authenticated;
-- id and answered_at are always set by the database.
grant insert (request_id, organisation_id, answer, show_identity, origin) on public.availability_answers to authenticated;

-- create_availability_request ---------------------------------------------------------------
-- Called by our server only, with the service role, after hashing the visitor's device id
-- (lib/availability/device.ts). Refuses a second request for the same molecule from the same
-- device within 24 hours with SQLSTATE RW429. Returns the request id.
create function public.create_availability_request(
  p_molecule_id uuid,
  p_medicine_id uuid,
  p_governorate_code text,
  p_delegation text,
  p_device_hash text,
  p_origin public.data_origin default 'tester'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  created timestamptz := now();
begin
  if p_medicine_id is not null and not exists (
    select 1 from public.medicines m where m.id = p_medicine_id and m.molecule_id = p_molecule_id
  ) then
    raise exception 'create_availability_request: presentation does not belong to the molecule' using errcode = '22023';
  end if;
  if p_origin = 'official_source' then
    raise exception 'create_availability_request: a request is never an official source' using errcode = '22023';
  end if;

  -- Two simultaneous requests from the same device for the same molecule: one waits for the other.
  perform pg_advisory_xact_lock(hashtextextended(p_device_hash || ':' || p_molecule_id::text, 0));

  if exists (
    select 1
    from public.availability_requests r
    where r.device_hash = p_device_hash
      and r.molecule_id = p_molecule_id
      and r.created_at > created - interval '24 hours'
  ) then
    raise exception 'create_availability_request: one request per medicine and device every 24 hours'
      using errcode = 'RW429';
  end if;

  insert into public.availability_requests
    (molecule_id, medicine_id, governorate_code, delegation, created_at, expires_at, device_hash, origin)
  values
    (p_molecule_id, p_medicine_id, p_governorate_code, nullif(btrim(p_delegation), ''), created,
     created + interval '3 hours', p_device_hash, p_origin)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_availability_request(uuid, uuid, text, text, text, public.data_origin) from public, anon, authenticated;
grant execute on function public.create_availability_request(uuid, uuid, text, text, text, public.data_origin) to service_role;

-- requests_for_my_pharmacy -----------------------------------------------------------------
-- A pharmacy's open requests in its governorate that it has not answered yet, oldest first.
-- Never the device hash. Refused to every other role.
create function public.requests_for_my_pharmacy()
returns table (
  request_id uuid,
  molecule_id uuid,
  molecule_name text,
  medicine_id uuid,
  medicine_label text,
  delegation text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  my_org uuid := app.current_organisation_id();
begin
  if my_org is null or app.current_organisation_type() <> 'pharmacy' then
    raise exception 'requests_for_my_pharmacy: pharmacies only' using errcode = '42501';
  end if;

  return query
  select r.id, r.molecule_id, mo.name, r.medicine_id, me.label, r.delegation, r.created_at, r.expires_at
  from public.availability_requests r
  join public.molecules mo on mo.id = r.molecule_id
  left join public.medicines me on me.id = r.medicine_id
  where r.governorate_code = app.current_governorate_code()
    and r.expires_at > now()
    and not exists (
      select 1 from public.availability_answers a where a.request_id = r.id and a.organisation_id = my_org
    )
  order by r.created_at;
end;
$$;

revoke all on function public.requests_for_my_pharmacy() from public, anon;
grant execute on function public.requests_for_my_pharmacy() to authenticated, service_role;

-- request_answers_public -------------------------------------------------------------------
-- For anyone holding the request id (a random UUID, known only to the visitor who made it):
-- the pharmacies that answered "available" AND chose to show themselves, and how many
-- pharmacies were asked and answered, small counts as '<3'. Nothing about pharmacies that
-- said no or stayed hidden. Null for an unknown id.
create function public.request_answers_public(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  req public.availability_requests;
  n_asked bigint;
  n_answered bigint;
  shown jsonb;
begin
  select * into req from public.availability_requests r where r.id = p_request_id;
  if not found then
    return null;
  end if;

  select count(*) into n_asked
  from public.organisations o
  where o.type = 'pharmacy'
    and o.governorate_code = req.governorate_code
    and o.created_at <= req.expires_at;

  select count(*) into n_answered from public.availability_answers a where a.request_id = req.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'display_name', o.display_name,
      'latitude', o.latitude,
      'longitude', o.longitude,
      'public_address', o.public_address,
      'answered_at', a.answered_at,
      'origin', a.origin
    ) order by a.answered_at), '[]'::jsonb)
    into shown
  from public.availability_answers a
  join public.organisations o on o.id = a.organisation_id
  where a.request_id = req.id
    and a.answer = 'available'
    and a.show_identity;

  return jsonb_build_object(
    'request_id', req.id,
    'molecule_id', req.molecule_id,
    'medicine_id', req.medicine_id,
    'governorate_code', req.governorate_code,
    'created_at', req.created_at,
    'expires_at', req.expires_at,
    'asked', app.display_count(n_asked),
    'answered', app.display_count(n_answered),
    'available', shown
  );
end;
$$;

revoke all on function public.request_answers_public(uuid) from public;
grant execute on function public.request_answers_public(uuid) to anon, authenticated, service_role;

-- demand_by_governorate --------------------------------------------------------------------
-- Patient demand for a molecule over the last p_window_days, per governorate: requests, those
-- that got at least one answer, those that got none. Counts only, small counts as '<3'.
-- Coordinators, wholesalers and hospital pharmacies; refused to pharmacies and visitors.
-- Shown next to the signal, never fed into it.
create function public.demand_by_governorate(p_molecule_id uuid, p_window_days integer default 7)
returns table (governorate_code text, requests text, answered text, unanswered text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type public.organisation_type := app.current_organisation_type();
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if not is_service and (caller_type is null or caller_type not in ('coordinator', 'wholesaler', 'hospital_pharmacy')) then
    raise exception 'demand_by_governorate: not allowed for this role' using errcode = '42501';
  end if;
  if p_window_days not between 1 and 90 then
    raise exception 'demand_by_governorate: window out of range' using errcode = '22023';
  end if;

  return query
  with req as (
    select r.governorate_code as gov,
           exists (select 1 from public.availability_answers a where a.request_id = r.id) as has_answer
    from public.availability_requests r
    where r.molecule_id = p_molecule_id
      and r.created_at > now() - make_interval(days => p_window_days)
  )
  select req.gov,
         app.display_count(count(*)),
         app.display_count(count(*) filter (where req.has_answer)),
         app.display_count(count(*) filter (where not req.has_answer))
  from req
  group by req.gov
  order by req.gov;
end;
$$;

revoke all on function public.demand_by_governorate(uuid, integer) from public, anon;
grant execute on function public.demand_by_governorate(uuid, integer) to authenticated, service_role;

update public.system_meta set schema_version = 10, updated_at = now();
