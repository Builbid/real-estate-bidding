-- ============================================================
-- Multi-Tier Real Estate Bidding Platform — Initial Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- ─── EXTENSIONS ────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ─── ENUM TYPES ────────────────────────────────────────────
create type user_role         as enum ('owner', 'builder', 'admin');
create type track_type        as enum ('RCC', 'AssamType');
create type project_status    as enum ('active_24h', 'frozen_24h', 'completed', 'cancelled');
create type rcc_config        as enum (
  'ground_only',
  'g_plus_1_structural',
  'g_plus_1_full',
  'g_plus_2_structural_structural',
  'g_plus_2_structural_full',
  'g_plus_2_full_structural',
  'g_plus_2_full_full'
);
create type assam_config      as enum ('frame_to_roof', 'full_finishing');

-- ─── PROFILES TABLE ────────────────────────────────────────
create table public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  role             user_role   not null default 'builder',
  full_name        text        not null,
  mobile           text,
  email            text        not null,
  physical_address text,
  pincode          text,
  is_verified      boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.profiles is 'Extended user profiles linked to auth.users';

-- ─── PROJECTS TABLE ────────────────────────────────────────
create table public.projects (
  id                  uuid          primary key default uuid_generate_v4(),
  owner_id            uuid          not null references public.profiles(id) on delete cascade,
  title               text          not null,
  description         text,
  track_type          track_type    not null,
  sub_configuration   jsonb         not null default '{}'::jsonb,
  district            text          not null,
  state               text          not null default 'Assam',
  plot_area_sqft      numeric(12,2),
  total_floors        smallint      not null default 1 check (total_floors between 1 and 3),
  status              project_status not null default 'active_24h',
  bidding_ends_at     timestamptz   not null,
  selection_ends_at   timestamptz,
  selected_builder_id uuid          references public.profiles(id),
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now()
);

comment on table public.projects is 'Real estate project listings posted by owners';
comment on column public.projects.sub_configuration is 'JSONB capturing multi-tier permutation: {rcc_config?, assam_config?, floors:[{floor, type}]}';

-- ─── BIDS TABLE ────────────────────────────────────────────
create table public.bids (
  id                uuid        primary key default uuid_generate_v4(),
  project_id        uuid        not null references public.projects(id) on delete cascade,
  builder_id        uuid        not null references public.profiles(id) on delete cascade,
  rates             jsonb       not null,
  -- rates schema: { ground_rate?: number, first_rate?: number, second_rate?: number }
  total_sum_metric  numeric(14,2) not null generated always as (
    coalesce((rates->>'ground_rate')::numeric, 0) +
    coalesce((rates->>'first_rate')::numeric, 0) +
    coalesce((rates->>'second_rate')::numeric, 0)
  ) stored,
  is_withdrawn      boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, builder_id)
);

comment on table public.bids is 'Builder bids containing per-floor rate/sqft data';
comment on column public.bids.rates is 'Per-floor rates: {ground_rate, first_rate?, second_rate?}';
comment on column public.bids.total_sum_metric is 'Auto-computed sum of all floor rates for ranking';

-- ─── AUDIT LOG TABLE ───────────────────────────────────────
create table public.audit_logs (
  id          uuid        primary key default uuid_generate_v4(),
  actor_id    uuid        references public.profiles(id),
  action      text        not null,
  entity_type text        not null,
  entity_id   uuid,
  payload     jsonb,
  ip_address  inet,
  created_at  timestamptz not null default now()
);

-- ─── INDEXES ───────────────────────────────────────────────
create index idx_projects_status           on public.projects(status);
create index idx_projects_bidding_ends_at  on public.projects(bidding_ends_at);
create index idx_projects_owner_id         on public.projects(owner_id);
create index idx_projects_district         on public.projects(district);
create index idx_bids_project_id           on public.bids(project_id);
create index idx_bids_builder_id           on public.bids(builder_id);
create index idx_bids_total_sum_metric     on public.bids(total_sum_metric);
create index idx_bids_created_at           on public.bids(created_at desc);
create index idx_audit_logs_actor_id       on public.audit_logs(actor_id);
create index idx_audit_logs_entity_id      on public.audit_logs(entity_id);

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger trg_bids_updated_at
  before update on public.bids
  for each row execute function public.handle_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'builder')::user_role
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── STATUS TRANSITION FUNCTION ────────────────────────────
create or replace function public.expire_active_projects()
returns void language plpgsql security definer as $$
begin
  update public.projects
  set    status            = 'frozen_24h',
         selection_ends_at = now() + interval '24 hours'
  where  status            = 'active_24h'
    and  bidding_ends_at  <= now();
end;
$$;

create or replace function public.expire_frozen_projects()
returns void language plpgsql security definer as $$
begin
  update public.projects
  set status = 'completed'
  where status = 'frozen_24h'
    and selection_ends_at <= now()
    and selected_builder_id is not null;

  update public.projects
  set status = 'cancelled'
  where status = 'frozen_24h'
    and selection_ends_at <= now()
    and selected_builder_id is null;
end;
$$;

-- ─── ENABLE ROW-LEVEL SECURITY ─────────────────────────────
alter table public.profiles   enable row level security;
alter table public.projects   enable row level security;
alter table public.bids       enable row level security;
alter table public.audit_logs enable row level security;

-- ─── PROFILES RLS ──────────────────────────────────────────
-- Owners can read their own full profile; builders see limited data; public sees nothing sensitive
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Admins can see all profiles
create policy "profiles_admin_all" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Public safe view: strips sensitive columns (handled via view below)
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ─── PUBLIC SAFE PROFILE VIEW ──────────────────────────────
create or replace view public.profiles_public as
  select id, role, full_name, created_at
  from   public.profiles;

comment on view public.profiles_public is 'Privacy-safe public profile view — no PII exposed';

-- ─── PROJECTS RLS ──────────────────────────────────────────
create policy "projects_select_public" on public.projects
  for select using (true);

create policy "projects_insert_owner" on public.projects
  for insert with check (
    auth.uid() = owner_id and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

create policy "projects_update_owner" on public.projects
  for update using (
    auth.uid() = owner_id or
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "projects_delete_admin" on public.projects
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── BIDS RLS ──────────────────────────────────────────────
-- During active window: anyone can see bid RATES but NOT builder identity
-- During frozen: project owner sees full bid with builder identity

create policy "bids_select_active_rates_only" on public.bids
  for select using (
    -- Show bid rates to everyone when project is active
    exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id and pr.status = 'active_24h'
    )
    or
    -- Show full bids to the project owner after frozen
    exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.owner_id = auth.uid()
        and pr.status in ('frozen_24h', 'completed')
    )
    or
    -- Builders can always see their own bids
    (auth.uid() = bids.builder_id)
    or
    -- Admins see all
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "bids_insert_builder" on public.bids
  for insert with check (
    auth.uid() = builder_id and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'builder'
    ) and
    -- Only allow bids during active window
    exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );

create policy "bids_update_builder_own" on public.bids
  for update using (
    auth.uid() = builder_id and
    exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );

create policy "bids_admin_all" on public.bids
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── AUDIT LOGS RLS ────────────────────────────────────────
create policy "audit_logs_admin_only" on public.audit_logs
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── REAL-TIME PUBLICATION ─────────────────────────────────
-- Enable realtime for live leaderboard
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.projects;

-- ─── ANON SAFE BID VIEW (hides builder_id during active phase) ──
create or replace view public.bids_public as
  select
    b.id,
    b.project_id,
    b.rates,
    b.total_sum_metric,
    b.created_at,
    -- Only expose builder_id when project is frozen/completed
    case
      when pr.status in ('frozen_24h', 'completed', 'cancelled')
        then b.builder_id
      else null
    end as builder_id
  from public.bids b
  join public.projects pr on pr.id = b.project_id
  where b.is_withdrawn = false;

comment on view public.bids_public is 'Privacy-enforced bid view — builder identity hidden during active phase';
