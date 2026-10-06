-- Site checklist PDFs stored with the agreement and quality-control copies
-- so both the homeowner and the worker can open them from their profile.

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'project_document_type'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'project_document_type'
      and e.enumlabel = 'site_checklist'
  ) then
    alter type public.project_document_type add value 'site_checklist';
  end if;
end $$;
