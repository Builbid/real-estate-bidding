-- Service-specific work requirements for remaining trades + drawing packages
alter table public.projects
  add column if not exists trade_details jsonb null;

alter table public.projects
  add column if not exists drawing_details jsonb null;

comment on column public.projects.trade_details is
  'Plumber / electrician / carpenter / interior / earthwork work requirements (scope, quantities, materials, start time).';

comment on column public.projects.drawing_details is
  'Drawing & Design package, floors, plot details, deliverables, and start time.';
