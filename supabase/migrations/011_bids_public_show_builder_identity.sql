-- ================================================================
-- Show builder identity on live bids — names/photos are public;
-- contact details remain in the raw profiles table only.
-- ================================================================

create or replace view public.bids_public as
  select
    b.id,
    b.project_id,
    b.rates,
    b.total_sum_metric,
    b.created_at,
    b.builder_id
  from public.bids b
  join public.projects pr on pr.id = b.project_id
  where b.is_withdrawn = false;

comment on view public.bids_public is
  'Public bid view — builder_id always exposed; use profiles_public for name/avatar (no contact PII)';
