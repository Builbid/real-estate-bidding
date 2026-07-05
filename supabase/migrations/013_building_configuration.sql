-- New owner wizard fields: multi-select building types + per-floor construction types.
-- Legacy track_type / sub_configuration columns are retained for bidding compatibility.

alter table public.projects
  add column if not exists building_types text[] not null default '{}',
  add column if not exists construction_types jsonb not null default '{}'::jsonb;

comment on column public.projects.building_types is
  'Selected building types from owner wizard Step 1, e.g. {"RCC Ground Floor","RCC 1st Floor"} or {"Assam Type"}';

comment on column public.projects.construction_types is
  'Per-building-type construction scope from owner wizard Step 2, e.g. {"RCC Ground Floor":"Full Finishing"}';
