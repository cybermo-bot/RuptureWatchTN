-- 0004 Followed molecules, pharmacy reports, and the aggregate other parties may see.
-- Rule: no pharmacy sees another pharmacy's reports. No other role selects from reports at all.

create type public.report_kind as enum ('not_delivered', 'delivered_again');
create type public.report_channel as enum ('web', 'whatsapp');

-- Followed molecules ------------------------------------------------------------------------
create table public.followed_molecules (
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  molecule_id uuid not null references public.molecules (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organisation_id, molecule_id)
);

alter table public.followed_molecules enable row level security;

create policy "followed_molecules: own organisation reads"
  on public.followed_molecules for select
  to authenticated
  using (organisation_id = (select app.current_organisation_id()));

create policy "followed_molecules: pharmacy adds for itself"
  on public.followed_molecules for insert
  to authenticated
  with check (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'pharmacy'
  );

create policy "followed_molecules: pharmacy removes its own"
  on public.followed_molecules for delete
  to authenticated
  using (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'pharmacy'
  );

revoke all on public.followed_molecules from anon, authenticated;
grant select, insert, delete on public.followed_molecules to authenticated;
grant all on public.followed_molecules to service_role;

-- Reports -----------------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete restrict,
  governorate_code text not null references public.governorates (code),
  molecule_id uuid not null references public.molecules (id) on delete restrict,
  medicine_id uuid references public.medicines (id) on delete set null,
  kind public.report_kind not null,
  ordered_at timestamptz,
  reported_at timestamptz not null default now(),
  channel public.report_channel not null default 'web',
  origin public.data_origin not null,
  constraint reports_not_delivered_needs_order_date
    check (kind = 'delivered_again' or ordered_at is not null),
  constraint reports_order_before_report
    check (ordered_at is null or ordered_at <= reported_at)
);

create index reports_molecule_time on public.reports (molecule_id, reported_at desc);
create index reports_organisation_time on public.reports (organisation_id, reported_at desc);

alter table public.reports enable row level security;

-- Only the reporting pharmacy reads its reports. Other roles match no policy and see nothing.
create policy "reports: pharmacy reads its own"
  on public.reports for select
  to authenticated
  using (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'pharmacy'
  );

-- A pharmacy inserts for itself, in its own governorate, now, on the web.
-- WhatsApp, the simulator and the replay insert through the service role.
create policy "reports: pharmacy inserts its own"
  on public.reports for insert
  to authenticated
  with check (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'pharmacy'
    and governorate_code = (select app.current_governorate_code())
    and channel = 'web'
    and origin in ('tester', 'simulated')
    and reported_at between now() - interval '5 minutes' and now() + interval '1 minute'
  );

-- Insert only: no update or delete for anyone but the service role.
revoke all on public.reports from anon, authenticated;
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;

-- Aggregate for coordinators, wholesalers and hospital pharmacies --------------------------
-- Distinct pharmacies with a valid "not delivered" report in the window, per governorate.
-- Counts below 3 are returned as '<3'. Never returns pharmacy ids or names.
--
-- This mirrors countByGovernorate() in lib/signal/governorates.ts. The thresholds are not
-- decided here: the server passes them from lib/signal/params.ts, and
-- tests/db/access.test.ts checks both give the same counts on the same data.
create function public.governorate_counts(
  p_molecule_id uuid,
  p_window_days integer default 14,
  p_min_undelivered_hours integer default 72,
  p_at timestamptz default now()
)
returns table (governorate_code text, governorate_name text, pharmacies text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_type public.organisation_type := app.current_organisation_type();
  is_service boolean := coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if not is_service and (caller_type is null or caller_type = 'pharmacy') then
    raise exception 'governorate_counts: not allowed for this role' using errcode = '42501';
  end if;
  if p_window_days not between 1 and 365 or p_min_undelivered_hours not between 0 and 720 then
    raise exception 'governorate_counts: parameter out of range' using errcode = '22023';
  end if;

  return query
  with counted as (
    select r.governorate_code as code, count(distinct r.organisation_id) as n
    from public.reports r
    where r.molecule_id = p_molecule_id
      and r.kind = 'not_delivered'
      and r.ordered_at is not null
      and r.reported_at <= p_at
      and r.reported_at > p_at - make_interval(days => p_window_days)
      and r.reported_at - r.ordered_at >= make_interval(hours => p_min_undelivered_hours)
    group by r.governorate_code
  )
  select
    c.code,
    g.name_fr,
    case when c.n < 3 then '<3' else c.n::text end
  from counted c
  join public.governorates g on g.code = c.code
  -- Suppressed cells are ordered by code only, so the order never reveals 1 versus 2.
  order by case when c.n < 3 then 0 else c.n end desc, c.code;
end;
$$;

revoke all on function public.governorate_counts(uuid, integer, integer, timestamptz) from public, anon;
grant execute on function public.governorate_counts(uuid, integer, integer, timestamptz) to authenticated, service_role;

update public.system_meta set schema_version = 4, updated_at = now();
