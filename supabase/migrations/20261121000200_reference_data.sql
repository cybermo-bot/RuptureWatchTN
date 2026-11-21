-- 0002 Reference data: governorates, molecules, medicines, fuzzy search.
-- Grants are explicit so the schema does not depend on the project's default exposure settings.

-- Governorates ------------------------------------------------------------------------------
-- Codes: ISO 3166-2:TN (24 governorates). Official reference data, not demo data,
-- so it lives in a migration rather than a seed file. Nobody writes to this table.
create table public.governorates (
  code text primary key check (code ~ '^TN-[0-9]{2}$'),
  name_fr text not null unique,
  name_ar text not null
);

alter table public.governorates enable row level security;

create policy "governorates: anyone can read"
  on public.governorates for select
  to anon, authenticated
  using (true);

revoke all on public.governorates from anon, authenticated;
grant select on public.governorates to anon, authenticated;
grant all on public.governorates to service_role;

insert into public.governorates (code, name_fr, name_ar) values
  ('TN-11', 'Tunis', 'تونس'),
  ('TN-12', 'Ariana', 'أريانة'),
  ('TN-13', 'Ben Arous', 'بن عروس'),
  ('TN-14', 'La Manouba', 'منوبة'),
  ('TN-21', 'Nabeul', 'نابل'),
  ('TN-22', 'Zaghouan', 'زغوان'),
  ('TN-23', 'Bizerte', 'بنزرت'),
  ('TN-31', 'Béja', 'باجة'),
  ('TN-32', 'Jendouba', 'جندوبة'),
  ('TN-33', 'Le Kef', 'الكاف'),
  ('TN-34', 'Siliana', 'سليانة'),
  ('TN-41', 'Kairouan', 'القيروان'),
  ('TN-42', 'Kasserine', 'القصرين'),
  ('TN-43', 'Sidi Bouzid', 'سيدي بوزيد'),
  ('TN-51', 'Sousse', 'سوسة'),
  ('TN-52', 'Monastir', 'المنستير'),
  ('TN-53', 'Mahdia', 'المهدية'),
  ('TN-61', 'Sfax', 'صفاقس'),
  ('TN-71', 'Gafsa', 'قفصة'),
  ('TN-72', 'Tozeur', 'توزر'),
  ('TN-73', 'Kébili', 'قبلي'),
  ('TN-81', 'Gabès', 'قابس'),
  ('TN-82', 'Médenine', 'مدنين'),
  ('TN-83', 'Tataouine', 'تطاوين');

-- Molecules ---------------------------------------------------------------------------------
-- One row per normalised DCI. Combinations keep the full DCI string ("PERINDOPRIL + INDAPAMIDE").
create table public.molecules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_norm text generated always as (app.normalize(name)) stored,
  atc_code text,
  watchlist boolean not null default false,
  created_at timestamptz not null default now()
);

create index molecules_name_trgm on public.molecules using gin (name_norm extensions.gin_trgm_ops);

alter table public.molecules enable row level security;

create policy "molecules: anyone can read"
  on public.molecules for select
  to anon, authenticated
  using (true);

revoke all on public.molecules from anon, authenticated;
grant select on public.molecules to anon, authenticated;
grant all on public.molecules to service_role;

-- Medicines ---------------------------------------------------------------------------------
-- National catalogue. `label` is the source's commercial name, kept word for word.
-- dosage, form and presentation stay empty unless a source gives them as separate fields.
create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  code_pct text not null unique,
  label text not null,
  brand text not null,
  dci text not null,
  dosage text,
  form text,
  presentation text,
  vei_category text check (vei_category in ('V', 'E', 'I')),
  price_tnd numeric(12, 3) check (price_tnd >= 0),
  molecule_id uuid not null references public.molecules (id) on delete restrict,
  source text not null,
  brand_norm text generated always as (app.normalize(brand)) stored,
  dci_norm text generated always as (app.normalize(dci)) stored,
  imported_at timestamptz not null default now()
);

create index medicines_brand_trgm on public.medicines using gin (brand_norm extensions.gin_trgm_ops);
create index medicines_dci_trgm on public.medicines using gin (dci_norm extensions.gin_trgm_ops);
create index medicines_molecule on public.medicines (molecule_id);

alter table public.medicines enable row level security;

create policy "medicines: anyone can read"
  on public.medicines for select
  to anon, authenticated
  using (true);

revoke all on public.medicines from anon, authenticated;
grant select on public.medicines to anon, authenticated;
grant all on public.medicines to service_role;

-- Search ------------------------------------------------------------------------------------
-- Up to 10 medicines, ranked by trigram word similarity on brand and DCI.
-- Accent- and case-insensitive. Accepts half words (prefix match) and small misspellings.
create function public.search_medicines(q text)
returns table (
  id uuid,
  code_pct text,
  label text,
  brand text,
  dci text,
  vei_category text,
  molecule_id uuid,
  molecule_name text,
  score real
)
language sql
stable
set search_path = ''
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with input as (
    select
      app.normalize(left(coalesce(q, ''), 100)) as v,
      replace(replace(replace(app.normalize(left(coalesce(q, ''), 100)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as prefix
  )
  select
    m.id,
    m.code_pct,
    m.label,
    m.brand,
    m.dci,
    m.vei_category,
    m.molecule_id,
    mol.name as molecule_name,
    greatest(
      extensions.word_similarity(i.v, m.brand_norm),
      extensions.word_similarity(i.v, m.dci_norm),
      case when m.brand_norm like i.prefix or m.dci_norm like i.prefix then 1 else 0 end
    )::real as score
  from public.medicines m
  cross join input i
  join public.molecules mol on mol.id = m.molecule_id
  where char_length(i.v) >= 2
    and (
      i.v operator(extensions.<%) m.brand_norm
      or i.v operator(extensions.<%) m.dci_norm
      or m.brand_norm like i.prefix
      or m.dci_norm like i.prefix
    )
  order by score desc, m.brand_norm, m.label
  limit 10
$$;

revoke all on function public.search_medicines(text) from public;
grant execute on function public.search_medicines(text) to anon, authenticated, service_role;

update public.system_meta set schema_version = 2, updated_at = now();
