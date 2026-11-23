-- 0020 Session 5, track B: patients' requests over WhatsApp. The bot shows a linked pharmacy
-- the requests routed to it and records its one-tap answer. The bot runs with the service
-- role, which row-level security does not stop, so these two functions apply the same rule as
-- the web answer's policy: a pharmacy, a request of its own governorate, still open, answered
-- once, with the pharmacy's own origin. Service role only.

-- requests_for_pharmacy ----------------------------------------------------------------------
-- The open requests of a pharmacy's governorate that it has not answered, oldest first. Never
-- the device hash. requests_for_my_pharmacy (the web) now reads through it, so there is one rule.
create function public.requests_for_pharmacy(p_organisation_id uuid)
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
  org public.organisations;
begin
  select * into org from public.organisations o where o.id = p_organisation_id;
  if not found or org.type <> 'pharmacy' then
    raise exception 'requests_for_pharmacy: pharmacies only' using errcode = '42501';
  end if;

  return query
  select r.id, r.molecule_id, mo.name, r.medicine_id, me.label, r.delegation, r.created_at, r.expires_at
  from public.availability_requests r
  join public.molecules mo on mo.id = r.molecule_id
  left join public.medicines me on me.id = r.medicine_id
  where r.governorate_code = org.governorate_code
    and r.expires_at > now()
    and not exists (
      select 1 from public.availability_answers a where a.request_id = r.id and a.organisation_id = org.id
    )
  order by r.created_at;
end;
$$;

revoke all on function public.requests_for_pharmacy(uuid) from public, anon, authenticated;
grant execute on function public.requests_for_pharmacy(uuid) to service_role;

create or replace function public.requests_for_my_pharmacy()
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
  return query select * from public.requests_for_pharmacy(my_org);
end;
$$;

-- answer_request_as --------------------------------------------------------------------------
-- Records a pharmacy's answer: 'answered', 'expired' (the request closed meanwhile) or
-- 'already' (it answered before). Refused when the request is not in the pharmacy's
-- governorate. Showing the pharmacy only makes sense with "disponible": a "pas disponible"
-- answer never shows it.
create function public.answer_request_as(
  p_organisation_id uuid,
  p_request_id uuid,
  p_answer public.availability_answer,
  p_show_identity boolean
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  org public.organisations;
  req public.availability_requests;
begin
  select * into org from public.organisations o where o.id = p_organisation_id;
  if not found or org.type <> 'pharmacy' then
    raise exception 'answer_request_as: pharmacies only' using errcode = '42501';
  end if;
  select * into req from public.availability_requests r where r.id = p_request_id;
  if not found or req.governorate_code <> org.governorate_code then
    raise exception 'answer_request_as: request not routed to this pharmacy' using errcode = '42501';
  end if;
  if req.expires_at <= now() then
    return 'expired';
  end if;

  insert into public.availability_answers (request_id, organisation_id, answer, show_identity, origin)
  values (req.id, org.id, p_answer, coalesce(p_show_identity, false) and p_answer = 'available', org.origin)
  on conflict (request_id, organisation_id) do nothing;
  if not found then
    return 'already';
  end if;
  return 'answered';
end;
$$;

revoke all on function public.answer_request_as(uuid, uuid, public.availability_answer, boolean) from public, anon, authenticated;
grant execute on function public.answer_request_as(uuid, uuid, public.availability_answer, boolean) to service_role;

update public.system_meta set schema_version = 20, updated_at = now();
