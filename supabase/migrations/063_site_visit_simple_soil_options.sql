-- Plain-language soil options for field supervisors.
-- Safe to run after 062, or directly on the original hard/medium/soft/filled values.

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'project_site_visits'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%soil_type%'
  loop
    execute format('alter table public.project_site_visits drop constraint %I', r.conname);
  end loop;
end $$;

update public.project_site_visits
set soil_type = case soil_type
  when 'hard' then 'hard_rocky'
  when 'hard_rock' then 'hard_rocky'
  when 'soft_rock' then 'hard_rocky'
  when 'medium' then 'sandy'
  when 'sandy_gravel' then 'sandy'
  when 'soft' then 'soft_muddy'
  when 'cohesive_clay' then 'soft_muddy'
  when 'black_cotton' then 'soft_muddy'
  when 'filled' then 'filled_loose'
  when 'filled_unconsolidated' then 'filled_loose'
  else 'normal_earth'
end
where soil_type not in (
  'normal_earth',
  'hard_rocky',
  'soft_muddy',
  'sandy',
  'filled_loose'
);

alter table public.project_site_visits
  add constraint project_site_visits_soil_type_check
  check (soil_type in (
    'normal_earth',
    'hard_rocky',
    'soft_muddy',
    'sandy',
    'filled_loose'
  ));
