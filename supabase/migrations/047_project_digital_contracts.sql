-- Dual-party Aadhaar OTP eSign contracts triggered from the Official Admin Portal.

create table if not exists public.project_digital_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  plinth_area_sqft numeric not null,
  start_date date not null,
  completion_date date not null,
  total_agreed_cost numeric not null,
  client_email text not null,
  contractor_email text not null,
  client_name text not null,
  contractor_name text not null,
  client_aadhaar_hash text not null,
  contractor_aadhaar_hash text not null,
  client_aadhaar_last4 text not null,
  contractor_aadhaar_last4 text not null,
  client_token text not null unique,
  contractor_token text not null unique,
  client_otp_hash text not null,
  contractor_otp_hash text not null,
  otp_expires_at timestamptz not null,
  client_verified_at timestamptz,
  contractor_verified_at timestamptz,
  client_signature_ref text,
  contractor_signature_ref text,
  status text not null default 'pending_esign'
    check (status in ('pending_esign', 'partially_signed', 'signed')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  signed_at timestamptz
);

create unique index if not exists project_digital_contracts_project_id_uidx
  on public.project_digital_contracts (project_id);

create index if not exists project_digital_contracts_client_token_idx
  on public.project_digital_contracts (client_token);

create index if not exists project_digital_contracts_contractor_token_idx
  on public.project_digital_contracts (contractor_token);

comment on table public.project_digital_contracts is
  'Admin-triggered digital contract drafts and dual Aadhaar OTP eSign state. Full Aadhaar numbers are never stored.';

alter table public.project_digital_contracts enable row level security;

drop policy if exists "project_digital_contracts_deny_all" on public.project_digital_contracts;
create policy "project_digital_contracts_deny_all"
  on public.project_digital_contracts
  for all
  using (false)
  with check (false);
