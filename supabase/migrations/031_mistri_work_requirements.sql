-- Mistri Contractor work requirements (civil work types, approx area, floor, contract, start time)
alter table public.projects
  add column if not exists mistri_details jsonb null;

comment on column public.projects.mistri_details is
  'Mistri (labour_contractor) projects: { civilWorkTypes, approximateAreaSqft, floorLevel, contractType, projectStartTimeType, projectStartTimeSpecificDate, additionalRequirements }';
