-- Lifetime "Bids Submitted" counter.
-- Bids cascade-delete with their project, so counting public.bids shrinks
-- when an owner/admin deletes history. This append-only log keeps every
-- submission even after the bid row is gone.

create table if not exists public.bid_submission_log (
  id           uuid        primary key default gen_random_uuid(),
  bid_id       uuid        unique,
  project_id   uuid,
  builder_id   uuid,
  submitted_at timestamptz not null default now()
);

comment on table public.bid_submission_log is
  'Append-only record of every bid ever submitted. Survives bid/project deletion.';

create index if not exists idx_bid_submission_log_submitted_at
  on public.bid_submission_log (submitted_at desc);

insert into public.bid_submission_log (bid_id, project_id, builder_id, submitted_at)
select b.id, b.project_id, b.builder_id, b.created_at
from public.bids b
where not exists (
  select 1 from public.bid_submission_log l where l.bid_id = b.id
);

create or replace function public.log_bid_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bid_submission_log (bid_id, project_id, builder_id, submitted_at)
  values (new.id, new.project_id, new.builder_id, coalesce(new.created_at, now()))
  on conflict (bid_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_log_bid_submission on public.bids;
create trigger trg_log_bid_submission
  after insert on public.bids
  for each row execute function public.log_bid_submission();

alter table public.bid_submission_log enable row level security;
