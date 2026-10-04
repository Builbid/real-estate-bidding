-- Consolidated, idempotent migration (safe to run whether or not 058 was applied before).
--   1) Supervisor workflow tables from 058 (project_site_visits, supervisor_commissions) + approval columns.
--   2) Site Visit Checklist: trade-specific measurements + total accurate cost.
--   3) shared_agreements: agreement copies shared with BOTH the Home Owner and the Mistri / Worker.
-- Requires only public.projects and public.profiles (already in the base schema).

-- ---------------------------------------------------------------------------
-- 1) project_site_visits  (plot / plinth are optional: only Civil / Mistri work records them)
-- ---------------------------------------------------------------------------
create table if not exists public.project_site_visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  supervisor_id uuid not null,
  visit_date date not null,
  plot_length_ft numeric check (plot_length_ft is null or plot_length_ft > 0),
  plot_width_ft numeric check (plot_width_ft is null or plot_width_ft > 0),
  plinth_area_sqft numeric check (plinth_area_sqft is null or plinth_area_sqft > 0),
  floors integer not null check (floors between 1 and 20),
  soil_type text not null check (soil_type in ('hard', 'medium', 'soft', 'filled')),
  road_width_ft numeric not null check (road_width_ft >= 0),
  water_available boolean not null default false,
  electricity_available boolean not null default false,
  storage_available boolean not null default false,
  site_notes text,
  agreement_started_at timestamptz,
  thumb_rule_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If 058 created the table earlier with NOT NULL plot / plinth columns, relax them.
alter table public.project_site_visits
  alter column plot_length_ft drop not null,
  alter column plot_width_ft drop not null,
  alter column plinth_area_sqft drop not null;

alter table public.project_site_visits
  add column if not exists trade_key text,
  add column if not exists measurements jsonb not null default '{}'::jsonb,
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists total_accurate_cost numeric
    check (total_accurate_cost is null or total_accurate_cost >= 0);

comment on column public.project_site_visits.measurements is
  'Supervisor-measured quantity per trade measurement line (line id -> quantity).';
comment on column public.project_site_visits.line_items is
  'Itemised measured lines: [{id, group, label, unit, rate, quantity, amount}] at the agreed bid rates.';
comment on column public.project_site_visits.total_accurate_cost is
  'Total Accurate Cost = sum(measured quantity x agreed rate). Pre-fills the agreement total.';

create unique index if not exists project_site_visits_project_id_uidx
  on public.project_site_visits (project_id);

alter table public.project_site_visits enable row level security;
drop policy if exists "project_site_visits_deny_all" on public.project_site_visits;
create policy "project_site_visits_deny_all"
  on public.project_site_visits for all using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 2) supervisor_commissions (from 058)
-- ---------------------------------------------------------------------------
create table if not exists public.supervisor_commissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  supervisor_id uuid not null,
  project_value numeric not null check (project_value >= 0),
  commission_bps integer not null default 20,
  amount numeric not null check (amount >= 0),
  status text not null default 'credited' check (status in ('credited', 'paid')),
  credited_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index if not exists supervisor_commissions_project_id_uidx
  on public.supervisor_commissions (project_id);
create index if not exists supervisor_commissions_supervisor_idx
  on public.supervisor_commissions (supervisor_id);

alter table public.supervisor_commissions enable row level security;
drop policy if exists "supervisor_commissions_deny_all" on public.supervisor_commissions;
create policy "supervisor_commissions_deny_all"
  on public.supervisor_commissions for all using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 3) Approval columns (from 058). project_digital_contracts comes from migration 047;
--    skipped here if that table has not been created yet.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.project_digital_contracts') is not null then
    alter table public.project_digital_contracts
      add column if not exists approved_at timestamptz,
      add column if not exists dispatched_at timestamptz;
  else
    raise notice 'public.project_digital_contracts not found - run 047_project_digital_contracts.sql, then re-run this script.';
  end if;
end $$;

alter table public.projects
  add column if not exists agreement_status text
    check (agreement_status is null or agreement_status in ('approved_active'));

comment on column public.projects.agreement_status is
  'approved_active once both parties signed via Aadhaar OTP eSign and the final PDFs were dispatched.';

-- ---------------------------------------------------------------------------
-- 4) shared_agreements: copy shared with the Home Owner AND the Mistri / Worker
-- ---------------------------------------------------------------------------
create table if not exists public.shared_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null,
  worker_id uuid not null,
  shared_by uuid not null,
  snapshot jsonb not null,
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live shared copy per project; re-sharing refreshes it.
create unique index if not exists shared_agreements_project_id_uidx
  on public.shared_agreements (project_id);
create index if not exists shared_agreements_owner_idx on public.shared_agreements (owner_id);
create index if not exists shared_agreements_worker_idx on public.shared_agreements (worker_id);

alter table public.shared_agreements enable row level security;

-- Only the two parties on the agreement can read it; writes are service-role only.
drop policy if exists "shared_agreements_party_select" on public.shared_agreements;
create policy "shared_agreements_party_select"
  on public.shared_agreements for select
  using (auth.uid() = owner_id or auth.uid() = worker_id);
