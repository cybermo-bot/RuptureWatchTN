-- 0005 Foreign notices, signals, the signal event log, alerts.
-- Levels are computed by lib/signal (evaluate). The database stores results, it does not decide them.

create type public.notice_status as enum ('shortage', 'tension', 'resolved');
create type public.signal_level as enum ('none', 'watch', 'likely', 'confirmed', 'cleared');
create type public.alert_channel as enum ('web', 'whatsapp');

-- Evidence is stored as counts only. This rejects any evidence that carries
-- pharmacy or organisation identifiers or a raw report list.
create function app.evidence_is_aggregate(evidence jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select evidence::text !~* '"(pharmacy_?ids?|organi[sz]ation_?ids?|reports|reporters)"\s*:'
$$;

grant execute on function app.evidence_is_aggregate(jsonb) to authenticated, service_role;

-- Foreign notices ---------------------------------------------------------------------------
create table public.foreign_notices (
  id uuid primary key default gen_random_uuid(),
  molecule_id uuid not null references public.molecules (id) on delete cascade,
  source text not null,
  status public.notice_status not null,
  published_at timestamptz not null,
  url text not null check (url ~ '^https?://'),
  origin public.data_origin not null,
  created_at timestamptz not null default now()
);

create index foreign_notices_molecule on public.foreign_notices (molecule_id, published_at desc);

alter table public.foreign_notices enable row level security;

create policy "foreign_notices: anyone can read"
  on public.foreign_notices for select
  to anon, authenticated
  using (true);

revoke all on public.foreign_notices from anon, authenticated;
grant select on public.foreign_notices to anon, authenticated;
grant all on public.foreign_notices to service_role;

-- Signals: current level per molecule ------------------------------------------------------
create table public.signals (
  molecule_id uuid primary key references public.molecules (id) on delete cascade,
  level public.signal_level not null,
  since timestamptz not null,
  rule text not null,
  evidence jsonb not null default '{}'::jsonb check (app.evidence_is_aggregate(evidence)),
  updated_at timestamptz not null default now()
);

alter table public.signals enable row level security;

create policy "signals: signed-in users read"
  on public.signals for select
  to authenticated
  using (true);

revoke all on public.signals from anon, authenticated;
grant select on public.signals to authenticated;
grant all on public.signals to service_role;

-- Signal events: every level change, with the rule that fired. Append only. -----------------
create table public.signal_events (
  id bigint generated always as identity primary key,
  molecule_id uuid not null references public.molecules (id) on delete restrict,
  from_level public.signal_level not null,
  to_level public.signal_level not null,
  rule text not null,
  evidence jsonb not null default '{}'::jsonb check (app.evidence_is_aggregate(evidence)),
  at timestamptz not null default now()
);

create index signal_events_molecule_time on public.signal_events (molecule_id, at desc);

-- No update ever. No delete, except inside a function that explicitly opens the reset
-- window for the scenario reset (set_config('rupturewatch.allow_event_reset', 'on', true)).
create function app.signal_events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'signal_events is append only: updates are not allowed' using errcode = '42501';
  end if;
  if coalesce(current_setting('rupturewatch.allow_event_reset', true), '') <> 'on' then
    raise exception 'signal_events is append only: deletes are not allowed' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger signal_events_append_only
  before update or delete on public.signal_events
  for each row execute function app.signal_events_append_only();

create trigger signal_events_no_truncate
  before truncate on public.signal_events
  for each statement execute function app.signal_events_append_only();

alter table public.signal_events enable row level security;

create policy "signal_events: signed-in users read"
  on public.signal_events for select
  to authenticated
  using (true);

revoke all on public.signal_events from anon, authenticated;
grant select on public.signal_events to authenticated;
grant select, insert, delete on public.signal_events to service_role;

-- Alerts ------------------------------------------------------------------------------------
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  signal_event_id bigint not null references public.signal_events (id) on delete cascade,
  channel public.alert_channel not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create index alerts_organisation_time on public.alerts (organisation_id, sent_at desc);

alter table public.alerts enable row level security;

create policy "alerts: own organisation reads"
  on public.alerts for select
  to authenticated
  using (organisation_id = (select app.current_organisation_id()));

revoke all on public.alerts from anon, authenticated;
grant select on public.alerts to authenticated;
grant all on public.alerts to service_role;

update public.system_meta set schema_version = 5, updated_at = now();
