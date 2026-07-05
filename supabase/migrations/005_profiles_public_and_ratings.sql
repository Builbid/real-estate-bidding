-- ================================================================
-- 1. Extend profiles_public view with is_verified
-- 2. Create builder_ratings table for star ratings & reviews
-- ================================================================

-- ─── PROFILES PUBLIC VIEW ───────────────────────────────────────
-- Allow anyone to read non-PII builder profile data.
-- Views in PostgreSQL run as the view owner (security definer),
-- so they bypass RLS on the underlying profiles table.

create or replace view public.profiles_public as
  select
    id,
    role,
    full_name,
    is_verified,
    created_at
  from public.profiles;

comment on view public.profiles_public is
  'Privacy-safe public profile view — no PII (no email, phone, address)';

-- ─── BUILDER RATINGS TABLE ──────────────────────────────────────

create table public.builder_ratings (
  id          uuid        primary key default uuid_generate_v4(),
  project_id  uuid        not null references public.projects(id)  on delete cascade,
  builder_id  uuid        not null references public.profiles(id)  on delete cascade,
  owner_id    uuid        not null references public.profiles(id)  on delete cascade,
  rating      smallint    not null default 4 check (rating between 1 and 5),
  review      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, builder_id)
);

comment on table public.builder_ratings is
  'Owner star ratings (1–5) and text reviews for builders, one per project';

create index idx_builder_ratings_builder_id  on public.builder_ratings(builder_id);
create index idx_builder_ratings_project_id  on public.builder_ratings(project_id);

create trigger trg_builder_ratings_updated_at
  before update on public.builder_ratings
  for each row execute function public.handle_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────

alter table public.builder_ratings enable row level security;

-- Public read — anyone can see ratings (portfolio display)
create policy "ratings_select_public" on public.builder_ratings
  for select using (true);

-- Owner of the project can insert/update their own rating
create policy "ratings_upsert_owner" on public.builder_ratings
  for all using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.projects pr
      where pr.id = builder_ratings.project_id
        and pr.owner_id = auth.uid()
    )
  );
