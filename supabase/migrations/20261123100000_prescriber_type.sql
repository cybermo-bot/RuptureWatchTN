-- 0017 Session 5, track B: the prescriber (a doctor checking a medicine's status).
-- Alone in its file: a new enum value can be used only after the transaction that adds it.

alter type public.organisation_type add value if not exists 'prescriber';
alter type public.profile_role add value if not exists 'prescriber';

update public.system_meta set schema_version = 17, updated_at = now();
