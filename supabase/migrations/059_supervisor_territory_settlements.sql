-- Supervisor territory (assigned pin codes) and monthly commission settlements / payment slips.
-- Service role only. Run after 053 and 058.

alter table public.supervisors
  add column if not exists assigned_pincodes text[] not null default '{}';

comment on column public.supervisors.assigned_pincodes is
  'Pin codes (6 digits) this supervisor covers. Only projects whose pincode is in this array are visible to them.';

create table if not exists public.supervisor_settlements (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null,
  period_month date not null,              -- first day of the settled month (IST)
  slip_number text not null unique,
  amount numeric not null check (amount > 0),
  commission_count integer not null default 0,
  reference text,
  paid_by uuid,
  paid_at timestamptz not null default now()
);

create index if not exists supervisor_settlements_supervisor_idx
  on public.supervisor_settlements (supervisor_id, period_month desc);

alter table public.supervisor_settlements enable row level security;
drop policy if exists "supervisor_settlements_deny_all" on public.supervisor_settlements;
create policy "supervisor_settlements_deny_all"
  on public.supervisor_settlements for all using (false) with check (false);

alter table public.supervisor_commissions
  add column if not exists settlement_id uuid references public.supervisor_settlements(id);
