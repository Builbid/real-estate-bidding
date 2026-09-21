-- Mistri bids store tiles/wall extras outside unused floor keys. A flooring-only
-- floor (or combined-scope tiles field) must not fail bid_rate_must_be_positive
-- when its ground/first/second/third slot is 0 or omitted.

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
  mistri_scoped boolean;
begin
  select p.service_type::text, p.track_type::text, p.mistri_details
    into project_service, project_track, mistri_details
  from public.projects p
  where p.id = new.project_id;

  skip_multiple_of_five :=
    coalesce(new.service_type::text, '') in (
      'painter', 'electrician', 'carpenter', 'drawing_design', 'false_ceiling_work', 'labour_contractor'
    )
    or coalesce(project_service, '') in (
      'painter', 'electrician', 'carpenter', 'drawing_design', 'false_ceiling_work', 'labour_contractor'
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

  mistri_scoped :=
    new.rates ? 'floor_civil_breakdown'
    or new.rates ? 'flooring_rates'
    or coalesce((new.rates->>'total_project_cost')::numeric, 0) > 0;

  foreach rate_key in array rate_keys
  loop
    if new.rates ? rate_key and new.rates->>rate_key is not null then
      rate_val := (new.rates->>rate_key)::numeric;

      if rate_val != trunc(rate_val) then
        raise exception 'bid_rate_must_be_whole_number: % must be a whole number', rate_key
          using errcode = 'check_violation';
      end if;

      if rate_val <= 0 then
        if mistri_scoped then
          continue;
        end if;
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
  'Validates bids.rates JSONB floor keys. Unused 0 keys are allowed on Mistri scoped bids (tiles/wall extras). Multiples of 5 except flexible services.';
