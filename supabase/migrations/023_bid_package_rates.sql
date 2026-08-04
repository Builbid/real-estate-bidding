-- ================================================================
-- Per-package bid pricing for construction firms
-- ================================================================
-- Construction firms now submit ONE rate per package they defined at
-- registration (bids.package_rates), instead of a single flat rate.
-- Ranking still relies on the existing generated total_sum_metric
-- column, so we keep writing the (rounded) average of the package
-- rates into rates.ground_rate / single_rate for ordering purposes
-- only — the average itself is never surfaced in the UI.
-- ================================================================

alter table public.bids
  add column if not exists package_rates jsonb;

comment on column public.bids.package_rates is
  'Construction firm bid detail: array of { rate, package } snapshots — one entry per firm-defined construction package at bid time. single_rate/rates.ground_rate hold the rounded average across these for ranking only and are not shown to users.';

drop view if exists public.bids_public;

create view public.bids_public as
  select
    b.id,
    b.project_id,
    b.rates,
    b.total_sum_metric,
    b.single_rate,
    b.package_rates,
    b.service_type,
    b.created_at,
    b.updated_at,
    b.builder_id
  from public.bids b
  join public.projects pr on pr.id = b.project_id
  where b.is_withdrawn = false;

comment on view public.bids_public is
  'Public bid view — includes single_rate and package_rates for construction firm projects';

grant select on public.bids_public to anon, authenticated;
