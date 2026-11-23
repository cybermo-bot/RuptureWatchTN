-- Active member pharmacies (session 3, network share of the "confirmed" bar).
--
-- The bar for "confirmée" is max(confirmMinPharmacies, ceil(confirmMemberShare x active members))
-- (lib/signal/evaluate.ts). This function gives the count: participating pharmacies, simulated
-- demo accounts excluded, with at least one report or one sign-in in the last p_days days.
-- A single number, no identifier. Service role only: the signal service calls it.

create function public.active_member_pharmacies(p_days integer default 90)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_days not between 1 and 365 then
    raise exception 'active_member_pharmacies: days out of range' using errcode = '22023';
  end if;
  return (
    select count(*)::integer
    from public.organisations o
    where o.type = 'pharmacy'
      and o.origin <> 'simulated'
      and (
        exists (
          select 1 from public.reports r
          where r.organisation_id = o.id
            and r.reported_at > now() - make_interval(days => p_days)
        )
        or exists (
          select 1
          from public.profiles p
          join auth.users u on u.id = p.user_id
          where p.organisation_id = o.id
            and u.last_sign_in_at > now() - make_interval(days => p_days)
        )
      )
  );
end;
$$;

revoke all on function public.active_member_pharmacies(integer) from public, anon, authenticated;
grant execute on function public.active_member_pharmacies(integer) to service_role;

update public.system_meta set schema_version = 14, updated_at = now();
