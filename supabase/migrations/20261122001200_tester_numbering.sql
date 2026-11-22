-- 0012 Session 4, fix 4: tester numbering restarts at 1.
--
-- The verification runs of session 2 used numbers 1 to 6 and were then removed, so the first
-- real tester would have been "Pharmacie testeuse n° 7". reset_tester_numbering() restarts the
-- sequence at 1, but only when no tester pharmacy exists: with testers still present it changes
-- nothing, so two pharmacies can never share a number. npm run verify:clean calls it after
-- removing a run's testers.

create function public.reset_tester_numbering()
returns table (reset boolean, remaining_testers integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_remaining integer;
begin
  -- Two resets or a reset and a sign-up at the same time: one waits for the other.
  lock table public.organisations in share row exclusive mode;
  select count(*)::integer into v_remaining from public.organisations o where o.origin = 'tester';
  if v_remaining > 0 then
    return query select false, v_remaining;
    return;
  end if;
  perform setval('public.tester_pharmacy_number', 1, false);
  return query select true, 0;
end;
$$;

revoke all on function public.reset_tester_numbering() from public, anon, authenticated;
grant execute on function public.reset_tester_numbering() to service_role;

-- Restart now, if no tester pharmacy exists (the live project has none since session 2).
select public.reset_tester_numbering();

update public.system_meta set schema_version = 12, updated_at = now();
