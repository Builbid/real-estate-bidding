-- ================================================================
-- Builder ratings (if missing), portfolio items, tightened RLS,
-- and rating stats RPC
-- ================================================================
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where needed.

-- ─── PROFILES PUBLIC VIEW ───────────────────────────────────────
-- Required by get_builder_rating_stats for privacy-safe owner names.
-- Drop first: CREATE OR REPLACE cannot reorder/rename view columns.

drop view if exists public.profiles_public cascade;

create view public.profiles_public as
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
-- Originally in 005; included here for databases that skipped that migration.

create table if not exists public.builder_ratings (
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

create index if not exists idx_builder_ratings_builder_id on public.builder_ratings(builder_id);
create index if not exists idx_builder_ratings_project_id on public.builder_ratings(project_id);

drop trigger if exists trg_builder_ratings_updated_at on public.builder_ratings;
create trigger trg_builder_ratings_updated_at
  before update on public.builder_ratings
  for each row execute function public.handle_updated_at();

alter table public.builder_ratings enable row level security;

drop policy if exists "ratings_select_public" on public.builder_ratings;
create policy "ratings_select_public" on public.builder_ratings
  for select using (true);

-- ─── BUILDER PORTFOLIO ITEMS ────────────────────────────────────
-- Stores a builder's showcased previous work (descriptions + photo URLs).
-- Never exposes builder PII — only portfolio content is public.

create table if not exists public.builder_portfolio_items (
  id          uuid        primary key default uuid_generate_v4(),
  builder_id  uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  description text,
  photo_urls  text[]      not null default '{}',
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.builder_portfolio_items is
  'Builder showcase work items — title, description, and photo URL array';

create index if not exists idx_builder_portfolio_builder_id on public.builder_portfolio_items(builder_id);

drop trigger if exists trg_builder_portfolio_items_updated_at on public.builder_portfolio_items;
create trigger trg_builder_portfolio_items_updated_at
  before update on public.builder_portfolio_items
  for each row execute function public.handle_updated_at();

alter table public.builder_portfolio_items enable row level security;

drop policy if exists "portfolio_select_public" on public.builder_portfolio_items;
create policy "portfolio_select_public" on public.builder_portfolio_items
  for select using (true);

drop policy if exists "portfolio_insert_own" on public.builder_portfolio_items;
create policy "portfolio_insert_own" on public.builder_portfolio_items
  for insert with check (auth.uid() = builder_id);

drop policy if exists "portfolio_update_own" on public.builder_portfolio_items;
create policy "portfolio_update_own" on public.builder_portfolio_items
  for update using (auth.uid() = builder_id);

drop policy if exists "portfolio_delete_own" on public.builder_portfolio_items;
create policy "portfolio_delete_own" on public.builder_portfolio_items
  for delete using (auth.uid() = builder_id);

-- ─── TIGHTEN BUILDER RATINGS RLS ────────────────────────────────
-- Owners may rate a builder ONLY after awarding them the project.

drop policy if exists "ratings_upsert_owner" on public.builder_ratings;
drop policy if exists "ratings_insert_awarded" on public.builder_ratings;
drop policy if exists "ratings_update_own_awarded" on public.builder_ratings;

create policy "ratings_insert_awarded" on public.builder_ratings
  for insert with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and pr.owner_id = auth.uid()
        and pr.selected_builder_id = builder_id
        and pr.status = 'completed'
    )
  );

create policy "ratings_update_own_awarded" on public.builder_ratings
  for update using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and pr.owner_id = auth.uid()
        and pr.selected_builder_id = builder_id
        and pr.status = 'completed'
    )
  );

-- ─── RATING STATS RPC ───────────────────────────────────────────
-- Returns aggregate rating data for a builder profile view.
-- Uses profiles_public for masked owner display names (no PII).

create or replace function public.get_builder_rating_stats(p_builder_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with ratings as (
    select rating, review, created_at, owner_id
    from public.builder_ratings
    where builder_id = p_builder_id
  ),
  counts as (
    select
      count(*)::int                                          as total,
      count(*) filter (where rating >= 4)::int             as positive,
      count(*) filter (where rating <= 2)::int               as negative,
      coalesce(round(avg(rating)::numeric, 1), 0)           as average,
      count(*) filter (where rating = 5)::int                as star_5,
      count(*) filter (where rating = 4)::int                as star_4,
      count(*) filter (where rating = 3)::int                as star_3,
      count(*) filter (where rating = 2)::int                as star_2,
      count(*) filter (where rating = 1)::int                as star_1
    from ratings
  ),
  reviews as (
    select
      r.rating,
      r.review,
      r.created_at,
      pp.full_name as owner_name
    from ratings r
    join public.profiles_public pp on pp.id = r.owner_id
    order by r.created_at desc
    limit 50
  )
  select json_build_object(
    'total',       c.total,
    'positive',    c.positive,
    'negative',    c.negative,
    'average',     c.average,
    'distribution', json_build_object(
      '5', c.star_5,
      '4', c.star_4,
      '3', c.star_3,
      '2', c.star_2,
      '1', c.star_1
    ),
    'reviews', coalesce(
      (select json_agg(row_to_json(reviews)) from reviews),
      '[]'::json
    )
  )
  from counts c;
$$;

comment on function public.get_builder_rating_stats(uuid) is
  'Aggregate builder rating stats with privacy-safe owner names for profile display';

grant execute on function public.get_builder_rating_stats(uuid) to anon, authenticated;
