-- Fallback document table used when public.project_documents is missing from the API schema.
-- The share action also creates this table at runtime when a database URL is configured.

create table if not exists public.site_checklist_documents (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null,
  numeric_project_id  text not null,
  project_name        text not null,
  document_type       text not null,
  file_name           text not null,
  storage_path        text,
  file_url            text,
  mime_type           text not null default 'application/pdf',
  owner_id            uuid not null,
  worker_id           uuid,
  owner_deleted       boolean not null default false,
  worker_deleted      boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (project_id, document_type)
);

alter table public.site_checklist_documents enable row level security;

drop policy if exists "site_checklist_documents_select_party" on public.site_checklist_documents;
create policy "site_checklist_documents_select_party"
  on public.site_checklist_documents
  for select
  to authenticated
  using (
    (auth.uid() = owner_id and owner_deleted = false)
    or (auth.uid() = worker_id and worker_deleted = false)
  );

grant select on table public.site_checklist_documents to authenticated;
grant all on table public.site_checklist_documents to service_role;

create table if not exists public.shared_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null,
  worker_id uuid not null,
  shared_by uuid not null,
  snapshot jsonb not null,
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists shared_agreements_project_id_uidx
  on public.shared_agreements (project_id);
alter table public.shared_agreements enable row level security;
drop policy if exists "shared_agreements_party_select" on public.shared_agreements;
create policy "shared_agreements_party_select"
  on public.shared_agreements
  for select
  to authenticated
  using (auth.uid() = owner_id or auth.uid() = worker_id);
grant select on table public.shared_agreements to authenticated;
grant all on table public.shared_agreements to service_role;

notify pgrst, 'reload schema';
