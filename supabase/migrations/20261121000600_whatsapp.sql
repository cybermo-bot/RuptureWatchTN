-- 0006 WhatsApp inbound messages.
-- Written and read by the service role only (the webhook). The sender is stored as a salted hash.

create table public.wa_inbound (
  message_id text primary key,
  sender_hash text not null,
  body text,
  received_at timestamptz not null default now()
);

create index wa_inbound_sender_time on public.wa_inbound (sender_hash, received_at desc);

alter table public.wa_inbound enable row level security;
-- No policy: anon and authenticated users match nothing.

revoke all on public.wa_inbound from anon, authenticated;
grant all on public.wa_inbound to service_role;

update public.system_meta set schema_version = 6, updated_at = now();
