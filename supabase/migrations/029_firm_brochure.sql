-- ============================================================
-- Construction firm brochure (PDF / image) for client viewing
-- ============================================================

alter table public.profiles
  add column if not exists brochure_url text;

comment on column public.profiles.brochure_url is
  'Public URL of firm brochure (PDF or image) in firm-brochures storage bucket';

-- Expose brochure on public firm profiles
drop view if exists public.firms_public;

create view public.firms_public as
  select
    id,
    company_name,
    logo_url,
    brochure_url,
    years_in_business,
    construction_class_packages,
    is_verified,
    public.mask_gst(gst_number) as gst_masked,
    gst_number is not null and length(trim(gst_number)) = 15 as gst_verified,
    physical_address,
    pincode,
    created_at
  from public.profiles
  where role = 'construction_firm';

comment on view public.firms_public is
  'Public firm profile — company name, logo, brochure, years, package descriptions';

grant select on public.firms_public to anon, authenticated;

-- Storage bucket: PDF + images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'firm-brochures',
  'firm-brochures',
  true,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "firm_brochures_public_read" on storage.objects;
drop policy if exists "firm_brochures_firm_insert" on storage.objects;
drop policy if exists "firm_brochures_firm_update" on storage.objects;
drop policy if exists "firm_brochures_firm_delete" on storage.objects;

create policy "firm_brochures_public_read"
  on storage.objects for select
  using (bucket_id = 'firm-brochures');

create policy "firm_brochures_firm_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'firm-brochures'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.get_my_role() = 'construction_firm'
  );

create policy "firm_brochures_firm_update"
  on storage.objects for update
  using (
    bucket_id = 'firm-brochures'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.get_my_role() = 'construction_firm'
  )
  with check (
    bucket_id = 'firm-brochures'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.get_my_role() = 'construction_firm'
  );

create policy "firm_brochures_firm_delete"
  on storage.objects for delete
  using (
    bucket_id = 'firm-brochures'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.get_my_role() = 'construction_firm'
  );
