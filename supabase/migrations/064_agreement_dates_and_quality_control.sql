-- Agreed timeline captured on the site visit, and a quality-control PDF in both parties' documents.

alter table public.project_site_visits
  add column if not exists agreed_start_date date,
  add column if not exists target_completion_date date;

comment on column public.project_site_visits.agreed_start_date is
  'Start date agreed on site with the homeowner and the mistri. Copied into agreement section 4.';
comment on column public.project_site_visits.target_completion_date is
  'Target completion date agreed on site. Copied into agreement section 4.';

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'project_document_type'
      and e.enumlabel = 'quality_control'
  ) then
    alter type public.project_document_type add value 'quality_control';
  end if;
end $$;
