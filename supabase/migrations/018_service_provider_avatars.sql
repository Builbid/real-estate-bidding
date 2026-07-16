-- Profile photos for Hire Services providers (painters, plumbers, etc.)

alter table public.service_providers
  add column if not exists avatar_url text;

comment on column public.service_providers.avatar_url is
  'Public profile photo URL stored in builder-avatars bucket ({user_id}/avatar.jpg)';

-- CREATE OR REPLACE VIEW cannot insert a column before existing ones (PG treats it as
-- renaming columns). Drop and recreate after adding avatar_url on the base table.
drop view if exists public.service_providers_public;

create view public.service_providers_public as
  select
    id,
    full_name,
    avatar_url,
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
