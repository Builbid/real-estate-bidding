-- Painter-only work requirements (area, primer, materials, flexible start time)
alter table public.projects
  add column if not exists painter_details jsonb null;

comment on column public.projects.painter_details is
  'Painter projects only: { projectArea, primerRequirement, materialsIncludeClient, projectStartTimeType, projectStartTimeSpecificDate }';
