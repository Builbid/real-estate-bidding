-- Production is missing projects.drawing_details (PostgREST schema cache error
-- on Drawing & Design launch). Idempotent add + cache reload.
alter table public.projects
  add column if not exists drawing_details jsonb null;

alter table public.projects
  add column if not exists trade_details jsonb null;

comment on column public.projects.drawing_details is
  'Drawing & Design package, floors, plot details, deliverables, and start time.';

notify pgrst, 'reload schema';
