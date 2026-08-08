-- Drawing & Design service type + project deliverable multi-select
alter type public.service_type add value if not exists 'drawing_design';

alter table public.projects
  add column if not exists drawing_types text[] not null default '{}';

comment on column public.projects.drawing_types is
  'Selected Drawing & Design deliverables (2d_house_plan, 3d_house_plan, etc.)';
