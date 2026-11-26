-- Pilot-3 item 1: the pharmacist may say which product (CNAM presentation) is missing.
--
-- reports.medicine_id already exists and stays nullable: WhatsApp, the seeds and « Plusieurs ou
-- je ne sais pas » insert without it. When a pharmacy gives one, it must be a presentation of
-- the reported molecule. The server action checks this too; the policy makes it hold for any
-- client. The level stays per molecule (lib/signal is unchanged).

drop policy "reports: pharmacy inserts its own" on public.reports;

create policy "reports: pharmacy inserts its own"
  on public.reports for insert
  to authenticated
  with check (
    organisation_id = (select app.current_organisation_id())
    and (select app.current_organisation_type()) = 'pharmacy'
    and governorate_code = (select app.current_governorate_code())
    and channel = 'web'
    and origin = (select app.current_organisation_origin())
    and reported_at between now() - interval '5 minutes' and now() + interval '1 minute'
    and (
      medicine_id is null
      or exists (
        select 1 from public.medicines m
        where m.id = reports.medicine_id and m.molecule_id = reports.molecule_id
      )
    )
  );

update public.system_meta set schema_version = 26, updated_at = now();
