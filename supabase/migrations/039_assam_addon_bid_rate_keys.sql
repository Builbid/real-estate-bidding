-- Assam Type Mistri add-on bidding: Civil + Roof + Tile + Chowkhat (4 rate keys).
-- Ranking uses the generated total_sum_metric (sum of all rate keys). Average is
-- sum / active item count in the app. Assam Type bids may use any whole number.

drop view if exists public.bids_public;

alter table public.bids drop column if exists total_sum_metric;

alter table public.bids
  add column total_sum_metric numeric(14,2) not null generated always as (
    coalesce((rates->>'ground_rate')::numeric, 0) +
    coalesce((rates->>'first_rate')::numeric, 0) +
    coalesce((rates->>'second_rate')::numeric, 0) +
    coalesce((rates->>'third_rate')::numeric, 0)
  ) stored;

comment on column public.bids.total_sum_metric is
  'Auto-computed sum of ground/first/second/third rate keys for ranking';

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

create or replace function public.validate_bid_rates()
returns trigger
language plpgsql
as $$
declare
  rate_key text;
  rate_val numeric;
  rate_keys text[] := array['ground_rate', 'first_rate', 'second_rate', 'third_rate'];
  project_service text;
  project_track text;
  mistri_details jsonb;
  skip_multiple_of_five boolean;
begin
  select p.service_type::text, p.track_type::text, p.mistri_details
    into project_service, project_track, mistri_details
  from public.projects p
  where p.id = new.project_id;

  skip_multiple_of_five :=
    coalesce(new.service_type::text, '') in (
      'painter', 'electrician', 'carpenter', 'drawing_design', 'false_ceiling_work'
    )
    or coalesce(project_service, '') in (
      'painter', 'electrician', 'carpenter', 'drawing_design', 'false_ceiling_work'
    )
    or coalesce(project_track, '') = 'AssamType'
    or (
      coalesce(project_service, '') = 'labour_contractor'
      and (
        coalesce(mistri_details->>'includeDoorWindowFrames', '') = 'true'
        or nullif(trim(coalesce(mistri_details->>'doorWindowFramesQuantity', '')), '') is not null
        or mistri_details->'floorWork' @> '[{"floorId":"Assam Type"}]'::jsonb
      )
    );

  foreach rate_key in array rate_keys
  loop
    if new.rates ? rate_key and new.rates->>rate_key is not null then
      rate_val := (new.rates->>rate_key)::numeric;

      if rate_val != trunc(rate_val) then
        raise exception 'bid_rate_must_be_whole_number: % must be a whole number', rate_key
          using errcode = 'check_violation';
      end if;

      if rate_val <= 0 then
        raise exception 'bid_rate_must_be_positive: % must be greater than zero', rate_key
          using errcode = 'check_violation';
      end if;

      if not skip_multiple_of_five and mod(rate_val::bigint, 5) != 0 then
        raise exception 'bid_rate_must_end_in_0_or_5: % must end in 0 or 5 (got %)', rate_key, rate_val
          using errcode = 'check_violation';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

comment on function public.validate_bid_rates() is
  'Validates bids.rates JSONB floor keys are positive whole numbers. Multiples of 5 required except painter, electrician, drawing_design, interior, legacy carpenter, Assam Type Mistri add-on bids, and Mistri Chowkhat bids.';
