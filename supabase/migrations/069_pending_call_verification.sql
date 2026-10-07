-- Owner selection waits for a company phone check before a field supervisor can act.
-- Service role writes these columns. Run in the Supabase SQL editor if selection reports the column is missing.

alter table public.projects
  add column if not exists call_verification_status text;

alter table public.projects
  drop constraint if exists projects_call_verification_status_check;

alter table public.projects
  add constraint projects_call_verification_status_check
  check (
    call_verification_status is null
    or call_verification_status in ('pending', 'verified')
  );

alter table public.projects
  add column if not exists owner_callback_phone text;

comment on column public.projects.call_verification_status is
  'pending: owner selected a builder and is waiting for the company phone check. verified: admin confirmed the call and transferred the project to the field supervisor.';

comment on column public.projects.owner_callback_phone is
  'Active phone number the owner confirmed when selecting a builder.';
