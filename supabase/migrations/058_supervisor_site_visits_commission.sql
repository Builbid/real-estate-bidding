-- Supervisor workflow: site visit checklist -> agreement -> Aadhaar eSign -> approval + 0.2% commission.
-- All tables are service-role only (no anon / authenticated access).

create table if not exists public.project_site_visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  supervisor_id uuid not null,
  visit_date date not null,
  plot_length_ft numeric not null check (plot_length_ft > 0),
  plot_width_ft numeric not null check (plot_width_ft > 0),
  plinth_area_sqft numeric not null check (plinth_area_sqft > 0),
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

create unique index if not exists project_site_visits_project_id_uidx
  on public.project_site_visits (project_id);

alter table public.project_site_visits enable row level security;
drop policy if exists "project_site_visits_deny_all" on public.project_site_visits;
create policy "project_site_visits_deny_all"
  on public.project_site_visits for all using (false) with check (false);

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

-- One commission per project, so a retry can never credit twice.
create unique index if not exists supervisor_commissions_project_id_uidx
  on public.supervisor_commissions (project_id);
create index if not exists supervisor_commissions_supervisor_idx
  on public.supervisor_commissions (supervisor_id);

alter table public.supervisor_commissions enable row level security;
drop policy if exists "supervisor_commissions_deny_all" on public.supervisor_commissions;
create policy "supervisor_commissions_deny_all"
  on public.supervisor_commissions for all using (false) with check (false);

alter table public.project_digital_contracts
  add column if not exists approved_at timestamptz,
  add column if not exists dispatched_at timestamptz;

alter table public.projects
  add column if not exists agreement_status text
    check (agreement_status is null or agreement_status in ('approved_active'));

comment on column public.projects.agreement_status is
  'approved_active once both parties signed via Aadhaar OTP eSign and the final PDFs were dispatched.';
