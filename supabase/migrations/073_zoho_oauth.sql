-- One server-only row for the Zoho CRM refresh token captured by /api/zoho/callback.
-- Row Level Security is on and no policies are granted, so the service role is the only reader and writer.

create table if not exists public.zoho_oauth (
  id text primary key,
  refresh_token text not null,
  api_domain text,
  updated_at timestamptz not null default now()
);

alter table public.zoho_oauth enable row level security;
