-- Queue for new Zoho CRM deliveries only.
-- Creates one new table. Does not read, update, or delete any existing records.

create table if not exists public.zoho_sync_outbox (
  id uuid primary key,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  zoho_lead_id text,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  constraint zoho_sync_outbox_status_check check (status in ('pending', 'sending', 'synced', 'failed'))
);

create index if not exists zoho_sync_outbox_due_idx
  on public.zoho_sync_outbox (next_attempt_at)
  where status = 'pending';

alter table public.zoho_sync_outbox enable row level security;
