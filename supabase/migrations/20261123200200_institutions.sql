-- 0023 Session 5, part 5: the institutions' spaces.
--
-- Pharmacie centrale (central_pharmacy): announces an expected delivery ("Arrivage annoncé")
-- for a medicine at "probable" or "confirmée". The announcement never changes a level: the
-- warning logic (lib/signal) does not read this table.
-- Ordre des pharmaciens (pharmacists_order): sees the network by governorate (counts, "<3"
-- below three, never a pharmacy) and writes short messages to the pharmacies of chosen
-- governorates. It reads no report and no pharmacy name.
-- Ministère (coordinator): reports and patients' demand per day, for its charts.
-- Every table has row-level security; every function checks its caller.

-- Arrivals announced by the centrale --------------------------------------------------------
create type public.arrival_quantity as enum ('under_one_month', 'one_to_three_months', 'over_three_months');

create table public.arrival_announcements (
  id uuid primary key default gen_random_uuid(),
  molecule_id uuid not null references public.molecules (id) on delete restrict,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  expected_on date not null,
  quantity public.arrival_quantity not null,
  -- The level when it was announced, for the decision log.
  level_at_announcement public.signal_level not null check (level_at_announcement in ('likely', 'confirmed')),
  announced_at timestamptz not null default now(),
  origin public.data_origin not null
);

create index arrival_announcements_molecule_time on public.arrival_announcements (molecule_id, announced_at desc);

alter table public.arrival_announcements enable row level security;

-- Every signed-in role reads them: an expected delivery is what pharmacies, wholesalers,
-- hospitals and the ministry need to know. It names no pharmacy. The public reads only
-- public_arrival() below.
create policy "arrival_announcements: signed-in users read"
  on public.arrival_announcements for select
  to authenticated
  using (true);

revoke all on public.arrival_announcements from anon, authenticated;
grant select on public.arrival_announcements to authenticated;
grant all on public.arrival_announcements to service_role;

-- The only way in: the caller must be a central purchasing organisation, the medicine must be
-- at "probable" or "confirmée" now, and the date between today and a year ahead (Tunis time).
-- Organisation, level, time and origin come from the database. Nothing is ever updated: a new
-- announcement is a new row, and the newest counts.
create function public.announce_arrival(p_molecule_id uuid, p_expected_on date, p_quantity public.arrival_quantity)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid := app.current_organisation_id();
  v_level public.signal_level;
  v_today date := (now() at time zone 'Africa/Tunis')::date;
  v_id uuid;
begin
  if v_org is null or app.current_organisation_type() is distinct from 'central_pharmacy' then
    raise exception 'announce_arrival: not allowed for this role' using errcode = '42501';
  end if;
  select s.level into v_level from public.signals s where s.molecule_id = p_molecule_id;
  if v_level is null or v_level not in ('likely', 'confirmed') then
    raise exception 'announce_arrival: the medicine is not at "probable" or "confirmée"' using errcode = '22023';
  end if;
  if p_expected_on is null or p_expected_on < v_today or p_expected_on > v_today + 365 or p_quantity is null then
    raise exception 'announce_arrival: date or quantity out of range' using errcode = '22023';
  end if;

  insert into public.arrival_announcements (molecule_id, organisation_id, expected_on, quantity, level_at_announcement, origin)
  values (p_molecule_id, v_org, p_expected_on, p_quantity, v_level, app.current_organisation_origin())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.announce_arrival(uuid, date, public.arrival_quantity) from public, anon;
grant execute on function public.announce_arrival(uuid, date, public.arrival_quantity) to authenticated, service_role;

-- What the public may know: the newest announcement still to come, and only while the medicine
-- is "confirmée" (CLAUDE.md rule 10: nothing below it). The date and the origin, nothing else.
create function public.public_arrival(p_molecule_id uuid)
returns table (expected_on date, announced_at timestamptz, origin public.data_origin)
language sql
stable
security definer
set search_path = ''
as $$
  select a.expected_on, a.announced_at, a.origin
  from public.arrival_announcements a
  join public.signals s on s.molecule_id = a.molecule_id and s.level = 'confirmed'
  where a.molecule_id = p_molecule_id
    and a.expected_on >= (now() at time zone 'Africa/Tunis')::date
  order by a.announced_at desc, a.id
  limit 1
$$;

revoke all on function public.public_arrival(uuid) from public;
grant execute on function public.public_arrival(uuid) to anon, authenticated, service_role;

-- Messages from the Ordre to the pharmacies of chosen governorates ----------------------------
create table public.order_messages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default app.current_organisation_id()
    references public.organisations (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 10 and 600),
  governorate_codes text[] not null check (cardinality(governorate_codes) between 1 and 24),
  sent_at timestamptz not null default now(),
  origin public.data_origin not null default app.current_organisation_origin()
);

create index order_messages_time on public.order_messages (sent_at desc);
create index order_messages_governorates on public.order_messages using gin (governorate_codes);

alter table public.order_messages enable row level security;

create policy "order_messages: the Ordre sends its own"
  on public.order_messages for insert
  to authenticated
  with check (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'pharmacists_order'
    and origin = (select app.current_organisation_origin())
    and governorate_codes <@ (select array_agg(g.code) from public.governorates g)
  );

create policy "order_messages: the sender reads its own"
  on public.order_messages for select
  to authenticated
  using (organisation_id = (select app.current_organisation_id()));

-- A pharmacy reads the messages addressed to its governorate, and no other.
create policy "order_messages: pharmacies of the chosen governorates read"
  on public.order_messages for select
  to authenticated
  using (
    (select app.current_organisation_type()) = 'pharmacy'
    and (select app.current_governorate_code()) = any (governorate_codes)
  );

revoke all on public.order_messages from anon, authenticated;
grant select on public.order_messages to authenticated;
-- Insert on the message's own columns only: organisation, time and origin come from the database.
grant insert (body, governorate_codes) on public.order_messages to authenticated;
grant all on public.order_messages to service_role;

-- The pharmacy's list, with the sender's name (an organisation a pharmacy cannot read
-- otherwise). The same filter as the policy above.
create function public.order_messages_for_me(p_limit integer default 20)
returns table (id uuid, body text, sent_at timestamptz, origin public.data_origin, sender_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.body, m.sent_at, m.origin, o.display_name
  from public.order_messages m
  join public.organisations o on o.id = m.organisation_id
  where app.current_organisation_type() = 'pharmacy'
    and app.current_governorate_code() = any (m.governorate_codes)
  order by m.sent_at desc, m.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

revoke all on function public.order_messages_for_me(integer) from public, anon;
grant execute on function public.order_messages_for_me(integer) to authenticated;

-- The network, for the Ordre and the ministry ------------------------------------------------
-- Member pharmacies by governorate and those active in the last p_days days (a report or a
-- sign-in, as active_member_pharmacies, simulated accounts included and badged here: this is
-- the participation picture, not the confirmation bar). "<3" below three; suppressed cells are
-- ordered by code only. `origins` is national (the same on every row), so no row tells which
-- kind of pharmacy sits in a small governorate.
create function public.pharmacy_network(p_days integer default 30)
returns table (governorate_code text, governorate_name text, members text, active text, origins public.data_origin[])
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type text := app.current_organisation_type()::text;
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if not is_service and (caller_type is null or caller_type not in ('pharmacists_order', 'coordinator')) then
    raise exception 'pharmacy_network: not allowed for this role' using errcode = '42501';
  end if;
  if p_days not between 1 and 365 then
    raise exception 'pharmacy_network: days out of range' using errcode = '22023';
  end if;

  return query
  with member_rows as (
    select o.id, o.governorate_code as code,
           (exists (select 1 from public.reports r
                     where r.organisation_id = o.id and r.reported_at > now() - make_interval(days => p_days))
            or exists (select 1 from public.profiles p join auth.users u on u.id = p.user_id
                        where p.organisation_id = o.id and u.last_sign_in_at > now() - make_interval(days => p_days))) as is_active
    from public.organisations o
    where o.type = 'pharmacy'
  ),
  national as (
    select coalesce(array_agg(distinct o.origin order by o.origin), '{}') as all_origins
    from public.organisations o where o.type = 'pharmacy'
  ),
  counted as (
    select m.code, count(*) as n, count(*) filter (where m.is_active) as n_active
    from member_rows m group by m.code
  )
  select c.code, g.name_fr, app.display_count(c.n), app.display_count(c.n_active), (select n.all_origins from national n)
  from counted c
  join public.governorates g on g.code = c.code
  order by case when c.n < 3 then 0 else c.n end desc, c.code;
end;
$$;

revoke all on function public.pharmacy_network(integer) from public, anon;
grant execute on function public.pharmacy_network(integer) to authenticated, service_role;

-- Reports per week, national: how many reports and how many distinct pharmacies, with the
-- origins behind them. Weeks start on Monday, Tunis time; empty weeks read "0".
create function public.network_weekly(p_weeks integer default 8)
returns table (week_start date, reports text, pharmacies text, origins public.data_origin[])
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type text := app.current_organisation_type()::text;
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
  v_this_week date := date_trunc('week', now() at time zone 'Africa/Tunis')::date;
begin
  if not is_service and (caller_type is null or caller_type not in ('pharmacists_order', 'coordinator')) then
    raise exception 'network_weekly: not allowed for this role' using errcode = '42501';
  end if;
  if p_weeks not between 1 and 52 then
    raise exception 'network_weekly: weeks out of range' using errcode = '22023';
  end if;

  return query
  with weeks as (
    select (v_this_week - (7 * w))::date as ws from generate_series(0, p_weeks - 1) w
  ),
  r as (
    select date_trunc('week', x.reported_at at time zone 'Africa/Tunis')::date as ws, x.organisation_id, x.origin
    from public.reports x
    where x.reported_at >= (v_this_week - 7 * (p_weeks - 1))::timestamp at time zone 'Africa/Tunis'
  )
  select w.ws,
         app.display_count(count(r.ws)),
         app.display_count(count(distinct r.organisation_id)),
         coalesce(array_agg(distinct r.origin order by r.origin) filter (where r.origin is not null), '{}')
  from weeks w
  left join r on r.ws = w.ws
  group by w.ws
  order by w.ws;
end;
$$;

revoke all on function public.network_weekly(integer) from public, anon;
grant execute on function public.network_weekly(integer) to authenticated, service_role;

-- Reports and patients' demand per day, for the ministry's charts -----------------------------
-- For one medicine, or the whole country when p_molecule_id is null: distinct pharmacies with
-- a valid "not delivered" report that day (the 72-hour rule passed in, as for governorate
-- counts), patients' requests, and those without any answer. Tunis days, oldest first; every
-- day of the window appears, "0" when nothing happened, "<3" for one or two.
create function public.daily_activity(p_molecule_id uuid, p_days integer default 30, p_min_undelivered_hours integer default 72)
returns table (day date, pharmacies text, requests text, unanswered text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type text := app.current_organisation_type()::text;
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
  v_today date := (now() at time zone 'Africa/Tunis')::date;
  v_from timestamptz;
begin
  if not is_service and caller_type is distinct from 'coordinator' then
    raise exception 'daily_activity: not allowed for this role' using errcode = '42501';
  end if;
  if p_days not between 1 and 90 or p_min_undelivered_hours not between 0 and 720 then
    raise exception 'daily_activity: parameter out of range' using errcode = '22023';
  end if;
  v_from := (v_today - (p_days - 1))::timestamp at time zone 'Africa/Tunis';

  return query
  with days as (
    select (v_today - d)::date as d from generate_series(0, p_days - 1) d
  ),
  rep as (
    select (x.reported_at at time zone 'Africa/Tunis')::date as d, count(distinct x.organisation_id) as n
    from public.reports x
    where (p_molecule_id is null or x.molecule_id = p_molecule_id)
      and x.kind = 'not_delivered'
      and x.ordered_at is not null
      and x.reported_at >= v_from
      and x.reported_at - x.ordered_at >= make_interval(hours => p_min_undelivered_hours)
    group by 1
  ),
  req as (
    select (q.created_at at time zone 'Africa/Tunis')::date as d,
           count(*) as n,
           count(*) filter (where not exists (select 1 from public.availability_answers a where a.request_id = q.id)) as n_open
    from public.availability_requests q
    where (p_molecule_id is null or q.molecule_id = p_molecule_id)
      and q.created_at >= v_from
    group by 1
  )
  select days.d,
         app.display_count(coalesce(rep.n, 0)),
         app.display_count(coalesce(req.n, 0)),
         app.display_count(coalesce(req.n_open, 0))
  from days
  left join rep on rep.d = days.d
  left join req on req.d = days.d
  order by days.d;
end;
$$;

revoke all on function public.daily_activity(uuid, integer, integer) from public, anon;
grant execute on function public.daily_activity(uuid, integer, integer) to authenticated, service_role;

-- Patients' requests over the last p_days days, national: all, and those without any answer.
-- The ministry's key figure; per-day values are in daily_activity.
create function public.demand_totals(p_days integer default 7)
returns table (requests text, unanswered text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type text := app.current_organisation_type()::text;
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if not is_service and caller_type is distinct from 'coordinator' then
    raise exception 'demand_totals: not allowed for this role' using errcode = '42501';
  end if;
  if p_days not between 1 and 90 then
    raise exception 'demand_totals: days out of range' using errcode = '22023';
  end if;
  return query
  select app.display_count(count(*)),
         app.display_count(count(*) filter (where not exists (select 1 from public.availability_answers a where a.request_id = q.id)))
  from public.availability_requests q
  where q.created_at > now() - make_interval(days => p_days);
end;
$$;

revoke all on function public.demand_totals(integer) from public, anon;
grant execute on function public.demand_totals(integer) to authenticated, service_role;

update public.system_meta set schema_version = 22, updated_at = now();
