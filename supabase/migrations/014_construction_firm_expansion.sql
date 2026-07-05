-- ================================================================
-- Construction Firm service expansion (schema-only)
-- ================================================================
-- Adds construction_firm alongside labour_contractor (renamed from
-- builder), new enums, profile/project/bid columns, firm_portfolio
-- table, storage buckets, and updated RLS.
--
-- Safe to re-run where noted (IF NOT EXISTS / DROP IF EXISTS).
-- Does NOT alter bidding rate logic, timers, or Realtime.
-- ================================================================

-- ─── PART 1: ENUM UPDATES ───────────────────────────────────────

-- Add new role value before renaming legacy 'builder'
alter type public.user_role add value if not exists 'construction_firm';

-- Rename legacy bidder role (existing rows pick up the new label automatically)
do $$ begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'user_role'
      and t.typnamespace = 'public'::regnamespace
      and e.enumlabel = 'builder'
  ) then
    alter type public.user_role rename value 'builder' to 'labour_contractor';
  end if;
end $$;

-- New enums for project / profile service classification
do $$ begin
  create type public.service_type as enum ('labour_contractor', 'construction_firm');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.finishing_level as enum ('basic', 'standard', 'premium');
exception
  when duplicate_object then null;
end $$;

comment on type public.service_type is
  'Whether a project or bidder is labour-contractor (floor-wise rates) or construction-firm (single ₹/sqft)';

comment on type public.finishing_level is
  'Construction firm finishing tier: basic (C Class), standard (B Class), premium (A Class)';

-- ─── PART 2: PROFILES TABLE ─────────────────────────────────────

alter table public.profiles
  alter column role set default 'labour_contractor';

alter table public.profiles
  add column if not exists company_name      text,
  add column if not exists gst_number        text,
  add column if not exists years_in_business integer,
  add column if not exists logo_url          text,
  add column if not exists service_type      public.service_type;

comment on column public.profiles.company_name is
  'Construction firm display name (construction_firm role only)';
comment on column public.profiles.gst_number is
  'GST registration number — required for construction_firm at app validation layer';
comment on column public.profiles.years_in_business is
  'Years the construction firm has been operating';
comment on column public.profiles.logo_url is
  'Public URL of company logo in firm-logos storage bucket';
comment on column public.profiles.service_type is
  'Bidder service line set at registration: labour_contractor or construction_firm';

-- Backfill service_type for existing labour contractors
update public.profiles
set service_type = 'labour_contractor'
where role = 'labour_contractor'
  and service_type is null;

-- ─── PART 3: FIRM PORTFOLIO TABLE ───────────────────────────────

create table if not exists public.firm_portfolio (
  id              uuid        primary key default gen_random_uuid(),
  firm_id         uuid        not null references public.profiles(id) on delete cascade,
  project_name    text        not null,
  location        text        not null,
  year_completed  integer     not null,
  photos          text[],
  description     text,
  created_at      timestamptz not null default now()
);

comment on table public.firm_portfolio is
  'Construction firm showcase portfolio — separate from labour contractor builder_portfolio_items';

create index if not exists idx_firm_portfolio_firm_id
  on public.firm_portfolio(firm_id);

alter table public.firm_portfolio enable row level security;

drop policy if exists "firm_portfolio_select_public" on public.firm_portfolio;
create policy "firm_portfolio_select_public" on public.firm_portfolio
  for select using (true);

drop policy if exists "firm_portfolio_insert_own" on public.firm_portfolio;
create policy "firm_portfolio_insert_own" on public.firm_portfolio
  for insert with check (
    auth.uid() = firm_id
    and public.get_my_role() = 'construction_firm'
  );

drop policy if exists "firm_portfolio_update_own" on public.firm_portfolio;
create policy "firm_portfolio_update_own" on public.firm_portfolio
  for update using (
    auth.uid() = firm_id
    and public.get_my_role() = 'construction_firm'
  );

drop policy if exists "firm_portfolio_delete_own" on public.firm_portfolio;
create policy "firm_portfolio_delete_own" on public.firm_portfolio
  for delete using (
    auth.uid() = firm_id
    and public.get_my_role() = 'construction_firm'
  );

-- ─── PART 4: PROJECTS TABLE ─────────────────────────────────────

-- Confirm wizard columns from migration 013 (no-op if already applied)
alter table public.projects
  add column if not exists building_types     text[]  not null default '{}',
  add column if not exists construction_types jsonb   not null default '{}'::jsonb;

alter table public.projects
  add column if not exists service_type      public.service_type not null default 'labour_contractor',
  add column if not exists floor_area_sqft   numeric(14,2),
  add column if not exists finishing_level   public.finishing_level,
  add column if not exists budget_range_min  numeric(14,2),
  add column if not exists budget_range_max  numeric(14,2),
  add column if not exists drawing_url       text;

comment on column public.projects.service_type is
  'Service the owner is seeking: labour_contractor (floor rates) or construction_firm (single rate)';
comment on column public.projects.floor_area_sqft is
  'Total floor area in sqft — primary area metric for construction firm projects';
comment on column public.projects.finishing_level is
  'Finishing tier for construction firm projects: basic / standard / premium';
comment on column public.projects.budget_range_min is
  'Optional minimum budget (₹) for construction firm projects';
comment on column public.projects.budget_range_max is
  'Optional maximum budget (₹) for construction firm projects';
comment on column public.projects.drawing_url is
  'Optional engineering drawing URL in project-drawings storage bucket';

-- All existing projects default to labour_contractor via column default
update public.projects
set service_type = 'labour_contractor'
where service_type is null;

-- ─── PART 5: BIDS TABLE ─────────────────────────────────────────

alter table public.bids
  add column if not exists single_rate   numeric(14,2),
  add column if not exists service_type  public.service_type;

comment on column public.bids.single_rate is
  'Single ₹/sqft rate for construction firm bids (labour contractor bids use rates jsonb)';
comment on column public.bids.service_type is
  'Denormalized copy of project.service_type for faster filtering';

-- Backfill existing bids to labour_contractor
update public.bids b
set service_type = coalesce(b.service_type, p.service_type, 'labour_contractor')
from public.projects p
where p.id = b.project_id;

-- ─── HELPERS ────────────────────────────────────────────────────

create or replace function public.get_my_service_type()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select service_type::text from public.profiles where id = auth.uid()
$$;

comment on function public.get_my_service_type() is
  'Returns authenticated user service_type without RLS recursion';

-- ─── PART 7: UPDATE RLS — ROLE RENAME (builder → labour_contractor) ─

-- Bids: replace insert policy with service_type cross-bidding prevention
drop policy if exists "bids_insert_builder" on public.bids;

create policy "bids_insert_bidder" on public.bids
  for insert with check (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'construction_firm')
    -- Bidder role must match project service line
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(
          bids.service_type,
          pr.service_type
        )
        and (
          (public.get_my_role() = 'labour_contractor'
            and pr.service_type = 'labour_contractor')
          or
          (public.get_my_role() = 'construction_firm'
            and pr.service_type = 'construction_firm')
        )
        and (
          (pr.status = 'active_24h' and pr.bidding_ends_at > now())
          or
          (pr.status = 'frozen_24h'
            and pr.selection_ends_at is not null
            and pr.selection_ends_at > now())
        )
    )
  );

-- Bid update: restrict to matching service_type bidders (same window rules as 003)
drop policy if exists "bids_update_builder_own" on public.bids;

create policy "bids_update_bidder_own" on public.bids
  for update using (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'construction_firm')
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(bids.service_type, pr.service_type)
        and (
          (public.get_my_role() = 'labour_contractor'
            and pr.service_type = 'labour_contractor')
          or
          (public.get_my_role() = 'construction_firm'
            and pr.service_type = 'construction_firm')
        )
        and (
          (pr.status = 'active_24h' and pr.bidding_ends_at > now())
          or
          (pr.status = 'frozen_24h'
            and pr.selection_ends_at is not null
            and pr.selection_ends_at > now())
        )
    )
  );

-- Labour contractor portfolio (existing table) — scope writes to labour_contractor role
drop policy if exists "portfolio_insert_own" on public.builder_portfolio_items;
create policy "portfolio_insert_own" on public.builder_portfolio_items
  for insert with check (
    auth.uid() = builder_id
    and public.get_my_role() = 'labour_contractor'
  );

drop policy if exists "portfolio_update_own" on public.builder_portfolio_items;
create policy "portfolio_update_own" on public.builder_portfolio_items
  for update using (
    auth.uid() = builder_id
    and public.get_my_role() = 'labour_contractor'
  );

drop policy if exists "portfolio_delete_own" on public.builder_portfolio_items;
create policy "portfolio_delete_own" on public.builder_portfolio_items
  for delete using (
    auth.uid() = builder_id
    and public.get_my_role() = 'labour_contractor'
  );

-- Projects: additive bidder-scoped read policies (marketplace public read retained)
drop policy if exists "projects_select_labour_contractor" on public.projects;
create policy "projects_select_labour_contractor" on public.projects
  for select using (
    public.get_my_role() = 'labour_contractor'
    and service_type = 'labour_contractor'
  );

drop policy if exists "projects_select_construction_firm" on public.projects;
create policy "projects_select_construction_firm" on public.projects
  for select using (
    public.get_my_role() = 'construction_firm'
    and service_type = 'construction_firm'
  );

-- NOTE: projects_select_public (using true) from 001 is intentionally retained so
-- the public homepage and marketplace listing remain non-breaking. Bid submission
-- enforces service_type matching at the DB layer via bids_insert_bidder.

-- ─── SIGNUP TRIGGER — map legacy 'builder' metadata ─────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role_text text;
  v_role      public.user_role;
  v_service   public.service_type;
begin
  v_role_text := coalesce(new.raw_user_meta_data->>'role', 'labour_contractor');

  -- Accept legacy 'builder' from auth metadata until app code is updated
  if v_role_text = 'builder' then
    v_role_text := 'labour_contractor';
  end if;

  v_role := v_role_text::public.user_role;

  v_service := case v_role
    when 'labour_contractor' then 'labour_contractor'::public.service_type
    when 'construction_firm' then 'construction_firm'::public.service_type
    else null
  end;

  insert into public.profiles (id, email, full_name, role, service_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_service
  )
  on conflict (id) do update
    set email        = excluded.email,
        full_name    = excluded.full_name,
        role         = excluded.role,
        service_type = coalesce(excluded.service_type, public.profiles.service_type);

  return new;
exception
  when others then
    raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- ─── PART 6: STORAGE BUCKETS ────────────────────────────────────
-- Path conventions:
--   firm-logos/{user_id}/logo.{ext}
--   firm-portfolio-photos/{user_id}/{portfolio_id}/{filename}
--   project-drawings/{user_id}/{project_id}/drawing.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'firm-logos',
  'firm-logos',
  true,
  3145728, -- 3 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'firm-portfolio-photos',
  'firm-portfolio-photos',
  true,
  5242880, -- 5 MB per photo
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-drawings',
  'project-drawings',
  true,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- firm-logos: public read; construction_firm writes own folder
drop policy if exists "firm_logos_public_read" on storage.objects;
drop policy if exists "firm_logos_firm_insert" on storage.objects;
drop policy if exists "firm_logos_firm_update" on storage.objects;
drop policy if exists "firm_logos_firm_delete" on storage.objects;

create policy "firm_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'firm-logos');

create policy "firm_logos_firm_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'firm-logos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "firm_logos_firm_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'firm-logos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'firm-logos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "firm_logos_firm_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'firm-logos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- firm-portfolio-photos: public read; construction_firm writes own folder
drop policy if exists "firm_portfolio_photos_public_read" on storage.objects;
drop policy if exists "firm_portfolio_photos_firm_insert" on storage.objects;
drop policy if exists "firm_portfolio_photos_firm_update" on storage.objects;
drop policy if exists "firm_portfolio_photos_firm_delete" on storage.objects;

create policy "firm_portfolio_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'firm-portfolio-photos');

create policy "firm_portfolio_photos_firm_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'firm-portfolio-photos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "firm_portfolio_photos_firm_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'firm-portfolio-photos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'firm-portfolio-photos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "firm_portfolio_photos_firm_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'firm-portfolio-photos'
    and public.get_my_role() = 'construction_firm'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- project-drawings: public read; owners write own folder
drop policy if exists "project_drawings_public_read" on storage.objects;
drop policy if exists "project_drawings_owner_insert" on storage.objects;
drop policy if exists "project_drawings_owner_update" on storage.objects;
drop policy if exists "project_drawings_owner_delete" on storage.objects;

create policy "project_drawings_public_read"
  on storage.objects for select
  using (bucket_id = 'project-drawings');

create policy "project_drawings_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-drawings'
    and public.get_my_role() = 'owner'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project_drawings_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-drawings'
    and public.get_my_role() = 'owner'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'project-drawings'
    and public.get_my_role() = 'owner'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "project_drawings_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-drawings'
    and public.get_my_role() = 'owner'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── STORAGE NOTES (application layer) ──────────────────────────
-- firm-portfolio-photos: enforce max 10 photos per portfolio item in app code.
-- gst_number: enforce NOT NULL for construction_firm registration in app code.
