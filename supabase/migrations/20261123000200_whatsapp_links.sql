-- 0015 WhatsApp links: a pharmacy links a WhatsApp number from its space.
-- The pharmacist types the number, receives a 6-digit code on WhatsApp, and types it back.
-- The number is stored as the salted hash used for wa_inbound (for matching incoming
-- messages), plus the number itself in reply_to, which is what is needed to send an alert
-- outside a conversation. Nothing else about the person. Written and read by the service
-- role only (server actions after a session check, and the webhook).

create table public.wa_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- Salted SHA-256 of "phone:<digits>", as lib/whatsapp/inbound.ts hashSender computes it.
  phone_hash text not null unique check (phone_hash ~ '^[0-9a-f]{64}$'),
  -- Salted SHA-256 of "bsuid:<business-scoped user id>", learnt from the first message.
  user_hash text unique check (user_hash ~ '^[0-9a-f]{64}$'),
  -- International number, digits only: the address for messages we start (alerts).
  reply_to text not null check (reply_to ~ '^[0-9]{8,15}$'),
  linked_at timestamptz not null default now(),
  -- Last message received from this number: inside 24 hours, a free-form alert can be sent.
  last_inbound_at timestamptz
);

create index wa_links_organisation on public.wa_links (organisation_id);

alter table public.wa_links enable row level security;
-- No policy: anon and authenticated users match nothing.
revoke all on public.wa_links from anon, authenticated;
grant all on public.wa_links to service_role;

-- One pending code per pharmacy. Replaced by a new request, deleted when used.
create table public.wa_link_codes (
  organisation_id uuid primary key references public.organisations (id) on delete cascade,
  phone_hash text not null check (phone_hash ~ '^[0-9a-f]{64}$'),
  reply_to text not null check (reply_to ~ '^[0-9]{8,15}$'),
  -- Salted SHA-256 of the organisation and the code: the code itself is never stored.
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  attempts integer not null default 0 check (attempts between 0 and 10),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint wa_link_codes_ten_minutes check (expires_at <= created_at + interval '10 minutes')
);

alter table public.wa_link_codes enable row level security;
revoke all on public.wa_link_codes from anon, authenticated;
grant all on public.wa_link_codes to service_role;

update public.system_meta set schema_version = 15, updated_at = now();
