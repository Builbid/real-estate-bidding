-- ================================================================
-- Record which specific firm package the owner selected
-- ================================================================
-- When an owner awards a construction_firm project, they now must
-- choose exactly which of the firm's bid packages they want (not just
-- the firm). We snapshot that package + its bid rate here, the same
-- shape used for bids.package_rates entries: { rate, package }.
-- ================================================================

alter table public.projects
  add column if not exists selected_package jsonb;

comment on column public.projects.selected_package is
  'Snapshot ({ rate, package }) of the specific construction firm package the owner chose when awarding the project. Null for labour_contractor projects.';
