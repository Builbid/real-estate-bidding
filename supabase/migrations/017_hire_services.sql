-- ================================================================
-- Hire Services — categories, providers, callback requests
-- Additive only; does not alter bidding / profiles roles.
-- ================================================================

-- ─── SERVICE CATEGORIES ─────────────────────────────────────────

create table if not exists public.service_categories (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  slug       text        not null unique,
  icon       text,
  created_at timestamptz not null default now()
);

insert into public.service_categories (name, slug, icon) values
  ('Painter', 'painter', '🎨'),
  ('Plumber', 'plumber', '🔧'),
  ('Electrician', 'electrician', '⚡'),
  ('Carpenter', 'carpenter', '🪚'),
  ('False Ceiling Work', 'false-ceiling-work', '🏠'),
  ('Earthwork', 'earthwork', '🚜')
on conflict (slug) do nothing;

-- ─── SERVICE PROVIDERS ──────────────────────────────────────────

create table if not exists public.service_providers (
  id                        uuid        primary key references auth.users(id) on delete cascade,
  full_name                 text        not null,
  phone                     text        not null,
  district                  text        not null,
  categories                uuid[]      not null default '{}',
  starting_rate             numeric(12,2),
  bio                       text,
  work_photo_urls           text[]      not null default '{}',
  rating_avg                numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  review_count              integer     not null default 0 check (review_count >= 0),
  status                    text        not null default 'active' check (status in ('active', 'inactive')),
  is_verified               boolean     not null default false,
  verification_submitted_at timestamptz,
  verification_docs_url     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_service_providers_status on public.service_providers(status);
create index if not exists idx_service_providers_district on public.service_providers(district);
create index if not exists idx_service_providers_categories on public.service_providers using gin(categories);

create trigger trg_service_providers_updated_at
  before update on public.service_providers
  for each row execute function public.handle_updated_at();

-- ─── CALLBACK REQUESTS ────────────────────────────────────────────

create table if not exists public.callback_requests (
  id           uuid        primary key default gen_random_uuid(),
  client_id    uuid        not null references auth.users(id) on delete cascade,
  provider_id  uuid        not null references public.service_providers(id) on delete cascade,
  client_phone text        not null,
  status       text        not null default 'pending' check (status in ('pending', 'contacted', 'completed')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_callback_requests_provider on public.callback_requests(provider_id);
create index if not exists idx_callback_requests_client on public.callback_requests(client_id);

-- ─── RLS ────────────────────────────────────────────────────────

alter table public.service_categories enable row level security;
alter table public.service_providers enable row level security;
alter table public.callback_requests enable row level security;

drop policy if exists "service_categories_public_read" on public.service_categories;
create policy "service_categories_public_read"
  on public.service_categories for select
  using (true);

drop policy if exists "service_providers_public_read_active" on public.service_providers;

-- Public listings expose no phone — use view only
create or replace view public.service_providers_public as
  select
    id,
    full_name,
    district,
    categories,
    starting_rate,
    bio,
    work_photo_urls,
    rating_avg,
    review_count,
    status,
    is_verified,
    verification_submitted_at,
    created_at,
    updated_at
  from public.service_providers
  where status = 'active';

grant select on public.service_providers_public to anon, authenticated;

drop policy if exists "service_providers_owner_read" on public.service_providers;
create policy "service_providers_owner_read"
  on public.service_providers for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "service_providers_owner_insert" on public.service_providers;
create policy "service_providers_owner_insert"
  on public.service_providers for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "service_providers_owner_update" on public.service_providers;
create policy "service_providers_owner_update"
  on public.service_providers for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "callback_requests_client_insert" on public.callback_requests;
create policy "callback_requests_client_insert"
  on public.callback_requests for insert
  to authenticated
  with check (auth.uid() = client_id);

drop policy if exists "callback_requests_client_read" on public.callback_requests;
create policy "callback_requests_client_read"
  on public.callback_requests for select
  to authenticated
  using (auth.uid() = client_id);

drop policy if exists "callback_requests_provider_read" on public.callback_requests;
create policy "callback_requests_provider_read"
  on public.callback_requests for select
  to authenticated
  using (auth.uid() = provider_id);

drop policy if exists "callback_requests_provider_update" on public.callback_requests;
create policy "callback_requests_provider_update"
  on public.callback_requests for update
  to authenticated
  using (auth.uid() = provider_id)
  with check (auth.uid() = provider_id);

-- Admin read/update for verification (profiles.role = admin)
drop policy if exists "service_providers_admin_read" on public.service_providers;
create policy "service_providers_admin_read"
  on public.service_providers for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "service_providers_admin_update" on public.service_providers;
create policy "service_providers_admin_update"
  on public.service_providers for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── STORAGE: private verification docs ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-verification',
  'provider-verification',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-work-photos',
  'provider-work-photos',
  true,
  3145728,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "provider_verification_owner_insert" on storage.objects;
drop policy if exists "provider_verification_owner_read" on storage.objects;
drop policy if exists "provider_verification_admin_read" on storage.objects;

create policy "provider_verification_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'provider-verification'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "provider_verification_owner_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'provider-verification'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "provider_verification_admin_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'provider-verification'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "provider_work_photos_public_read" on storage.objects;
drop policy if exists "provider_work_photos_owner_write" on storage.objects;

create policy "provider_work_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'provider-work-photos');

create policy "provider_work_photos_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'provider-work-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "provider_work_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'provider-work-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
