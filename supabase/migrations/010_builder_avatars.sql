-- ================================================================
-- Builder profile avatars — column, public view, storage bucket
-- ================================================================
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where needed.

-- ─── PROFILES: avatar_url column ──────────────────────────────────

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Public URL of the builder profile photo stored in builder-avatars bucket';

-- ─── PROFILES PUBLIC VIEW ─────────────────────────────────────────
-- avatar_url is non-PII (public image URL) — safe to expose post-reveal.

drop view if exists public.profiles_public cascade;

create view public.profiles_public as
  select
    id,
    role,
    full_name,
    is_verified,
    avatar_url,
    created_at
  from public.profiles;

comment on view public.profiles_public is
  'Privacy-safe public profile view — no PII (no email, phone, address)';

-- ─── STORAGE BUCKET ───────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'builder-avatars',
  'builder-avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── STORAGE RLS POLICIES ─────────────────────────────────────────
-- Path convention: builder-avatars/{user_id}/avatar.{ext}
-- Public READ; INSERT/UPDATE/DELETE restricted to folder owner.

drop policy if exists "builder_avatars_public_read" on storage.objects;
drop policy if exists "builder_avatars_owner_insert" on storage.objects;
drop policy if exists "builder_avatars_owner_update" on storage.objects;
drop policy if exists "builder_avatars_owner_delete" on storage.objects;

create policy "builder_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'builder-avatars');

create policy "builder_avatars_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'builder-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "builder_avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'builder-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'builder-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "builder_avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'builder-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── PRIVACY CROSS-CHECK ────────────────────────────────────────
-- avatar_url is exposed via profiles_public (no email/phone/address).
-- Live leaderboard queries must use profiles_public — never raw profiles.
-- Contact details remain in the profiles table and are UI-gated only.
