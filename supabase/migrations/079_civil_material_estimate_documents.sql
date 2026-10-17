-- Civil / Mistri material-estimate PDFs share the same document list as
-- agreements and quality-control forms.

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
      and e.enumlabel = 'civil_material_estimate'
  ) then
    alter type public.project_document_type add value 'civil_material_estimate';
  end if;
end $$;
