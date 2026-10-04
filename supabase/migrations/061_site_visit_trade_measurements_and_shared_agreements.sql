-- Supervisor Site Visit Checklist: trade-specific measurements + dual-account agreement sharing.

-- 1) Non-civil trades (plumbing / electrical / painting / ...) measure itemised quantities,
--    so plot dimensions and plinth area become optional. (Check constraints still reject
--    non-positive values; NULL passes a CHECK.)
alter table public.project_site_visits
  alter column plot_length_ft drop not null,
  alter column plot_width_ft drop not null,
  alter column plinth_area_sqft drop not null;

alter table public.project_site_visits
  add column if not exists trade_key text,
  add column if not exists measurements jsonb not null default '{}'::jsonb,
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists total_accurate_cost numeric check (total_accurate_cost is null or total_accurate_cost >= 0);

comment on column public.project_site_visits.measurements is
  'Supervisor-measured quantity per trade measurement line (line id -> quantity).';
comment on column public.project_site_visits.line_items is
  'Itemised measured lines: [{id, group, label, unit, rate, quantity, amount}] at the agreed bid rates.';
comment on column public.project_site_visits.total_accurate_cost is
  'Total Accurate Cost = sum(measured quantity x agreed rate). Pre-fills the agreement total.';

-- 2) Agreement copies the supervisor shares with BOTH the Home Owner and the Mistri / Worker.
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
