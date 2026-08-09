-- ============================================================
-- Specialty provider portfolio (Drawing & Design + trades)
-- Reuses builder_portfolio_items; widens write RLS; adds photo bucket.
-- ============================================================

-- Allow labour_contractor OR service_provider to manage own portfolio items
drop policy if exists "portfolio_insert_own" on public.builder_portfolio_items;
create policy "portfolio_insert_own" on public.builder_portfolio_items
  for insert with check (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'service_provider')
  );

drop policy if exists "portfolio_update_own" on public.builder_portfolio_items;
create policy "portfolio_update_own" on public.builder_portfolio_items
  for update using (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'service_provider')
  );

drop policy if exists "portfolio_delete_own" on public.builder_portfolio_items;
create policy "portfolio_delete_own" on public.builder_portfolio_items
  for delete using (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'service_provider')
  );

-- Public read already exists (portfolio_select_public)

-- Storage bucket for uploaded portfolio photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'builder-portfolio-photos',
  'builder-portfolio-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read
drop policy if exists "builder_portfolio_photos_public_read" on storage.objects;
create policy "builder_portfolio_photos_public_read" on storage.objects
  for select using (bucket_id = 'builder-portfolio-photos');

-- Labour contractors + specialty providers write to own folder
drop policy if exists "builder_portfolio_photos_insert_own" on storage.objects;
create policy "builder_portfolio_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'builder-portfolio-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.get_my_role() in ('labour_contractor', 'service_provider')
  );

drop policy if exists "builder_portfolio_photos_update_own" on storage.objects;
create policy "builder_portfolio_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'builder-portfolio-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.get_my_role() in ('labour_contractor', 'service_provider')
  );

drop policy if exists "builder_portfolio_photos_delete_own" on storage.objects;
create policy "builder_portfolio_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'builder-portfolio-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.get_my_role() in ('labour_contractor', 'service_provider')
  );
