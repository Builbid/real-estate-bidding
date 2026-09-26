-- Supervisor signup OTP challenges and private Aadhaar registration records.
-- Service role only. No anon or authenticated access.

create table if not exists public.supervisor_signup_otps (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.supervisor_signup_otps is
  'Short-lived hashed email OTP challenges for admin/supervisor registration.';

alter table public.supervisor_signup_otps enable row level security;

drop policy if exists "supervisor_signup_otps_deny_all" on public.supervisor_signup_otps;
create policy "supervisor_signup_otps_deny_all"
  on public.supervisor_signup_otps
  for all
  using (false)
  with check (false);

create table if not exists public.supervisor_registrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text not null,
  staff_position text not null,
  aadhaar_number text not null,
  aadhaar_front_path text not null,
  aadhaar_back_path text not null,
  created_at timestamptz not null default now()
);

comment on table public.supervisor_registrations is
  'Private supervisor registration records, including Aadhaar verification files.';

alter table public.supervisor_registrations enable row level security;

drop policy if exists "supervisor_registrations_deny_all" on public.supervisor_registrations;
create policy "supervisor_registrations_deny_all"
  on public.supervisor_registrations
  for all
  using (false)
  with check (false);

alter table public.profiles
  add column if not exists staff_position text;

insert into storage.buckets (id, name, public)
values ('supervisor-aadhaar', 'supervisor-aadhaar', false)
on conflict (id) do update set public = false;
