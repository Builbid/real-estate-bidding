-- Rank bids by total estimated project cost: Σ (floor area × floor rate),
-- mistri project cost, or fixture-point totals. Lowest value ranks #1.

drop view if exists public.bids_public;

alter table public.bids drop column if exists total_sum_metric;

alter table public.bids
  add column total_sum_metric numeric(14,2) not null generated always as (
    case
      when coalesce(nullif(btrim(coalesce(rates->>'total_estimated_cost', '')), ''), '') <> ''
        and (rates->>'total_estimated_cost')::numeric > 0
      then (rates->>'total_estimated_cost')::numeric
      when coalesce(nullif(btrim(coalesce(rates->>'total_project_cost', '')), ''), '') <> ''
        and (rates->>'total_project_cost')::numeric > 0
      then (rates->>'total_project_cost')::numeric
      when coalesce(nullif(btrim(coalesce(rates->>'total_civil_cost', '')), ''), '') <> ''
        and (rates->>'total_civil_cost')::numeric > 0
      then (rates->>'total_civil_cost')::numeric
      when coalesce(nullif(btrim(coalesce(rates->>'total_bid_amount', '')), ''), '') <> ''
        and (rates->>'total_bid_amount')::numeric > 0
      then (rates->>'total_bid_amount')::numeric
      else
        coalesce((rates->>'ground_rate')::numeric, 0) +
        coalesce((rates->>'first_rate')::numeric, 0) +
        coalesce((rates->>'second_rate')::numeric, 0) +
        coalesce((rates->>'third_rate')::numeric, 0)
    end
  ) stored;

comment on column public.bids.total_sum_metric is
  'Ranking metric: total_estimated_cost when present, otherwise project/civil/point totals, otherwise sum of floor rate keys. Lowest ranks first.';

create index if not exists idx_bids_total_sum_metric on public.bids(total_sum_metric);

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
