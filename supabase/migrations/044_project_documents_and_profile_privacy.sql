-- ================================================================
-- Project documents (shared owner/worker repository + server backup)
-- Numeric project IDs, strict profile PII RLS, and soft-delete flags
-- ================================================================

-- ─── 1) Short numeric-only project ID ────────────────────────────────

alter table public.projects
  add column if not exists numeric_id text;

comment on column public.projects.numeric_id is
  'Short numeric-only public project identifier (6 digits), shared by all project documents.';

create or replace function public.generate_numeric_project_id()
returns text
language plpgsql
as $$
declare
  candidate text;
  n int;
begin
  for n in 1..80 loop
    candidate := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
    if not exists (select 1 from public.projects where numeric_id = candidate) then
      return candidate;
    end if;
  end loop;

  candidate := lpad(
    ((extract(epoch from clock_timestamp())::bigint % 900000) + 100000)::text,
    6,
    '0'
  );
  if exists (select 1 from public.projects where numeric_id = candidate) then
    raise exception 'Could not allocate a unique numeric project ID';
  end if;
  return candidate;
end;
$$;

create or replace function public.set_project_numeric_id()
returns trigger
language plpgsql
as $$
begin
  if new.numeric_id is null or btrim(new.numeric_id) = '' then
    new.numeric_id := public.generate_numeric_project_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projects_numeric_id on public.projects;
create trigger trg_projects_numeric_id
  before insert on public.projects
  for each row execute function public.set_project_numeric_id();

do $$
declare
  r record;
begin
  for r in select id from public.projects where numeric_id is null loop
    update public.projects
    set numeric_id = public.generate_numeric_project_id()
    where id = r.id;
  end loop;
end $$;

alter table public.projects
  drop constraint if exists projects_numeric_id_format;

alter table public.projects
  add constraint projects_numeric_id_format
  check (numeric_id is null or numeric_id ~ '^[0-9]{6}$');

create unique index if not exists projects_numeric_id_key
  on public.projects (numeric_id);

-- ─── 2) Project documents (immutable server backup) ──────────────────

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'project_document_type'
  ) then
    create type public.project_document_type as enum ('agreement', 'estimate', 'ai_design');
  end if;
end $$;

create table if not exists public.project_documents (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references public.projects(id) on delete restrict,
  numeric_project_id  text not null,
  project_name        text not null,
  document_type       public.project_document_type not null,
  file_name           text not null,
  storage_path        text,
  file_url            text,
  mime_type           text not null default 'application/pdf',
  owner_id            uuid not null references public.profiles(id) on delete restrict,
  worker_id           uuid references public.profiles(id) on delete restrict,
  owner_deleted       boolean not null default false,
  worker_deleted      boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (project_id, document_type)
);

comment on table public.project_documents is
  'Shared owner/worker document records. Soft-delete flags hide a copy from one party; the master file stays on the server.';

comment on column public.project_documents.owner_deleted is
  'When true, hidden from the home owner UI only. Master backup is retained.';
comment on column public.project_documents.worker_deleted is
  'When true, hidden from the worker UI only. Master backup is retained.';

create index if not exists project_documents_owner_id_idx
  on public.project_documents (owner_id)
  where owner_deleted = false;

create index if not exists project_documents_worker_id_idx
  on public.project_documents (worker_id)
  where worker_deleted = false;

create index if not exists project_documents_numeric_id_idx
  on public.project_documents (numeric_project_id);

drop trigger if exists trg_project_documents_updated_at on public.project_documents;
create trigger trg_project_documents_updated_at
  before update on public.project_documents
  for each row execute function public.handle_updated_at();

create or replace function public.protect_project_document_backup()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Project documents are retained as an immutable BuilBid backup and cannot be deleted.';
  end if;

  if not public.is_builbid_admin() then
    new.project_id := old.project_id;
    new.numeric_project_id := old.numeric_project_id;
    new.project_name := old.project_name;
    new.document_type := old.document_type;
    new.file_name := old.file_name;
    new.storage_path := old.storage_path;
    new.file_url := old.file_url;
    new.mime_type := old.mime_type;
    new.owner_id := old.owner_id;
    new.worker_id := old.worker_id;
    new.created_at := old.created_at;

    if auth.uid() = old.owner_id then
      new.worker_deleted := old.worker_deleted;
    elsif auth.uid() = old.worker_id then
      new.owner_deleted := old.owner_deleted;
    end if;

    if old.owner_deleted then
      new.owner_deleted := true;
    end if;
    if old.worker_deleted then
      new.worker_deleted := true;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_project_document_backup on public.project_documents;
create trigger trg_protect_project_document_backup
  before update or delete on public.project_documents
  for each row execute function public.protect_project_document_backup();

alter table public.project_documents enable row level security;

drop policy if exists "project_documents_select_visible" on public.project_documents;
create policy "project_documents_select_visible"
  on public.project_documents
  for select
  to authenticated
  using (
    public.is_builbid_admin()
    or (auth.uid() = owner_id and owner_deleted = false)
    or (auth.uid() = worker_id and worker_deleted = false)
  );

drop policy if exists "project_documents_insert_admin" on public.project_documents;
create policy "project_documents_insert_admin"
  on public.project_documents
  for insert
  to authenticated
  with check (public.is_builbid_admin());

drop policy if exists "project_documents_update_party" on public.project_documents;
create policy "project_documents_update_party"
  on public.project_documents
  for update
  to authenticated
  using (
    public.is_builbid_admin()
    or auth.uid() = owner_id
    or auth.uid() = worker_id
  )
  with check (
    public.is_builbid_admin()
    or auth.uid() = owner_id
    or auth.uid() = worker_id
  );

drop policy if exists "project_documents_builbid_admin_all" on public.project_documents;
create policy "project_documents_builbid_admin_all"
  on public.project_documents
  for all
  using (public.is_builbid_admin())
  with check (public.is_builbid_admin());

create or replace function public.hide_own_project_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.project_documents;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into doc
  from public.project_documents
  where id = p_document_id;

  if not found then
    raise exception 'Document not found';
  end if;

  if auth.uid() = doc.owner_id then
    update public.project_documents
    set owner_deleted = true
    where id = p_document_id;
  elsif auth.uid() = doc.worker_id then
    update public.project_documents
    set worker_deleted = true
    where id = p_document_id;
  elsif public.is_builbid_admin() then
    return;
  else
    raise exception 'Not authorized to hide this document';
  end if;
end;
$$;

comment on function public.hide_own_project_document(uuid) is
  'Soft-hides a document from the caller''s Documents UI. Master backup is never removed.';

grant execute on function public.hide_own_project_document(uuid) to authenticated;

-- ─── 3) Private storage bucket for document backups ──────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Clients never read/write storage directly. Downloads go through a signed-URL API.
drop policy if exists "project_documents_storage_select" on storage.objects;
drop policy if exists "project_documents_storage_insert" on storage.objects;
drop policy if exists "project_documents_storage_update" on storage.objects;
drop policy if exists "project_documents_storage_delete" on storage.objects;

create policy "project_documents_storage_admin_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'project-documents' and public.is_builbid_admin());

-- ─── 4) Strict profile PII: own row + BuilBid admins only ────────────

drop policy if exists "profiles_authenticated_read_all" on public.profiles;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_builbid_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_builbid_admin())
  with check (auth.uid() = id or public.is_builbid_admin());

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if not public.is_builbid_admin() then
    new.id := old.id;
    new.role := old.role;
    new.is_admin := old.is_admin;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- Unique emails when the existing data allows it
do $$
begin
  if not exists (
    select 1 from public.profiles
    where email is not null and btrim(email) <> ''
    group by lower(email)
    having count(*) > 1
  ) then
    create unique index if not exists profiles_email_lower_uidx
      on public.profiles (lower(email));
  end if;
end $$;

-- Public non-PII view: names, avatars, trade — never email/mobile/address
drop view if exists public.profiles_public cascade;

create view public.profiles_public as
  select
    id,
    role,
    full_name,
    is_verified,
    avatar_url,
    service_type,
    created_at
  from public.profiles;

comment on view public.profiles_public is
  'Privacy-safe public profile view — no PII (no email, phone, address). Used for bidding identity reveal.';

grant select on public.profiles_public to anon, authenticated;

-- Recreate rating stats RPC (dropped with profiles_public cascade)
create or replace function public.get_builder_rating_stats(p_builder_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with ratings as (
    select rating, review, created_at, owner_id
    from public.builder_ratings
    where builder_id = p_builder_id
  ),
  counts as (
    select
      count(*)::int                                          as total,
      count(*) filter (where rating >= 4)::int             as positive,
      count(*) filter (where rating <= 2)::int               as negative,
      coalesce(round(avg(rating)::numeric, 1), 0)           as average,
      count(*) filter (where rating = 5)::int                as star_5,
      count(*) filter (where rating = 4)::int                as star_4,
      count(*) filter (where rating = 3)::int                as star_3,
      count(*) filter (where rating = 2)::int                as star_2,
      count(*) filter (where rating = 1)::int                as star_1
    from ratings
  ),
  reviews as (
    select
      r.rating,
      r.review,
      r.created_at,
      pp.full_name as owner_name
    from ratings r
    join public.profiles_public pp on pp.id = r.owner_id
    order by r.created_at desc
    limit 50
  )
  select json_build_object(
    'total',       c.total,
    'positive',    c.positive,
    'negative',    c.negative,
    'average',     c.average,
    'distribution', json_build_object(
      '5', c.star_5,
      '4', c.star_4,
      '3', c.star_3,
      '2', c.star_2,
      '1', c.star_1
    ),
    'reviews', coalesce(
      (select json_agg(row_to_json(reviews)) from reviews),
      '[]'::json
    )
  )
  from counts c;
$$;

grant execute on function public.get_builder_rating_stats(uuid) to anon, authenticated;

grant select, insert, update on table public.project_documents to authenticated;
grant all on table public.project_documents to service_role;
grant usage on type public.project_document_type to authenticated, service_role;
