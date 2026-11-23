-- 0022 Session 5, part 5: the Pharmacie centrale and the Ordre des pharmaciens get a space.
-- Alone in its file with the enum values: a new value can be used only after the transaction
-- that adds it commits.
--
-- Also closes part 4: the code that passes p_cleared_at is deployed (commit 957cb6a), so the
-- nine-argument apply_signal_evaluation kept by 20261123200000 goes.

drop function public.apply_signal_evaluation(uuid, public.signal_level, timestamptz, public.signal_level, timestamptz, text, jsonb, timestamptz, boolean);

alter type public.organisation_type add value if not exists 'central_pharmacy';
alter type public.organisation_type add value if not exists 'pharmacists_order';
alter type public.profile_role add value if not exists 'central_buyer';
alter type public.profile_role add value if not exists 'order_council';

-- Schema 21: signals.cleared_at (20261123200000) and these types.
update public.system_meta set schema_version = 21, updated_at = now();
