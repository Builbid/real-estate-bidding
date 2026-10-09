-- Worker experience on the public profile, and a site location on
-- completed-work portfolio items. years_in_business is already on profiles
-- (migration 014) and is not contact PII, so it can be shown on worker cards.
--
-- CREATE OR REPLACE VIEW cannot reorder existing columns. Production's
-- profiles_public still has created_at where later migrations put service_type,
-- so the view is dropped and recreated. get_builder_rating_stats depends on
-- the view and is restored immediately after.

alter table public.builder_portfolio_items
  add column if not exists location text;

comment on column public.builder_portfolio_items.location is
  'Site location for a completed project in the worker portfolio showcase.';

drop view if exists public.profiles_public cascade;

create view public.profiles_public as
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

grant select on public.profiles_public to anon, authenticated, service_role;

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
      count(*) filter (where rating >= 4)::int               as positive,
      count(*) filter (where rating <= 2)::int               as negative,
      coalesce(round(avg(rating)::numeric, 1), 0)            as average,
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
