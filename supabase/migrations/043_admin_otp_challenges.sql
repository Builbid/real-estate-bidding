-- Optional fallback store when native Auth email_otp is unavailable.
-- Primary OTP delivery uses Gmail SMTP + Auth generateLink email_otp.

create table if not exists public.admin_otp_challenges (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.admin_otp_challenges is
  'Short-lived hashed OTP challenges for Official Admin Portal (fallback path).';

alter table public.admin_otp_challenges enable row level security;

-- No anon/authenticated policies — only service role writes/reads this table.
drop policy if exists "admin_otp_challenges_deny_all" on public.admin_otp_challenges;
create policy "admin_otp_challenges_deny_all"
  on public.admin_otp_challenges
  for all
  using (false)
  with check (false);
