-- Worker experience on the public profile, and a site location on
-- completed-work portfolio items. years_in_business is already on profiles
-- (migration 014) and is not contact PII, so it can be shown on worker cards.

alter table public.builder_portfolio_items
  add column if not exists location text;

comment on column public.builder_portfolio_items.location is
  'Site location for a completed project in the worker portfolio showcase.';

-- Append the column. CREATE OR REPLACE cannot reorder existing view columns.
create or replace view public.profiles_public as
  select
    id,
    role,
    full_name,
    is_verified,
    avatar_url,
    service_type,
    created_at,
    years_in_business
  from public.profiles;

comment on view public.profiles_public is
  'Privacy-safe public profile view — no email, phone, or address. Includes years of experience for worker profiles.';

grant select on public.profiles_public to anon, authenticated;
