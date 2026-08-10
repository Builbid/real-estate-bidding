-- Painter-only work requirements (area, primer, materials, flexible start time)
alter table public.projects
  add column if not exists painter_details jsonb null;

comment on column public.projects.painter_details is
  'Painter projects only: { projectArea, primerRequirement, materialsIncludeClient (true=Without Material/client provides), projectStartTimeType (1week|2week|1month|specific), projectStartTimeSpecificDate }';
