-- Technical soil classifications for the site visit checklist.
-- Existing shorthand values are mapped forward so the new check can be applied.

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
  when 'hard' then 'hard_rock'
  when 'medium' then 'sandy_gravel'
  when 'soft' then 'cohesive_clay'
  when 'filled' then 'filled_unconsolidated'
  else soil_type
end
where soil_type in ('hard', 'medium', 'soft', 'filled');

alter table public.project_site_visits
  add constraint project_site_visits_soil_type_check
  check (soil_type in (
    'hard_rock',
    'soft_rock',
    'cohesive_clay',
    'sandy_gravel',
    'black_cotton',
    'filled_unconsolidated'
  ));
