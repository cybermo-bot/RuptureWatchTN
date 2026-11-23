-- Track D: the wholesaler's decisions on a fair split, kept on record.
-- A wholesaler records its own decisions and reads them; coordinators read all of them.
-- Nobody updates or deletes a decision: a new decision is a new row.

create table public.allocation_decisions (
  id uuid primary key default gen_random_uuid(),
  molecule_id uuid not null references public.molecules (id) on delete restrict,
  organisation_id uuid not null default app.current_organisation_id()
    references public.organisations (id) on delete cascade,
  -- Boxes the wholesaler said it had.
  stock integer not null check (stock between 0 and 10000000),
  -- The split proposed: hospital reserve, boxes and days of cover by governorate, parameters.
  recommended jsonb not null check (jsonb_typeof(recommended) = 'object'),
  applied boolean not null,
  deviation_reason text check (deviation_reason is null or char_length(deviation_reason) <= 2000),
  decided_at timestamptz not null default now(),
  -- The figures behind the split are simulated in the prototype; the deciding organisation's
  -- origin is recorded too (a demo wholesaler is simulated).
  origin public.data_origin not null default app.current_organisation_origin(),
  -- Not applying the split needs a reason of a few words.
  constraint allocation_decisions_reason check (
    applied or (deviation_reason is not null and char_length(btrim(deviation_reason)) >= 15)
  )
);

create index allocation_decisions_molecule_time on public.allocation_decisions (molecule_id, decided_at desc);
create index allocation_decisions_organisation_time on public.allocation_decisions (organisation_id, decided_at desc);

alter table public.allocation_decisions enable row level security;

create policy "allocation_decisions: wholesaler records its own"
  on public.allocation_decisions for insert
  to authenticated
  with check (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'wholesaler'
    and origin = (select app.current_organisation_origin())
  );

create policy "allocation_decisions: wholesaler reads its own"
  on public.allocation_decisions for select
  to authenticated
  using (organisation_id = (select app.current_organisation_id()));

create policy "allocation_decisions: coordinators read all"
  on public.allocation_decisions for select
  to authenticated
  using ((select app.current_organisation_type()) = 'coordinator');

revoke all on public.allocation_decisions from anon, authenticated;
grant select on public.allocation_decisions to authenticated;
-- Insert on the decision's own columns only: id, organisation_id, decided_at and origin come
-- from the database.
grant insert (molecule_id, stock, recommended, applied, deviation_reason) on public.allocation_decisions to authenticated;
grant all on public.allocation_decisions to service_role;

-- Set by the team lead at integration (session 3): the next schema version after 0015.
update public.system_meta set schema_version = 16, updated_at = now();
