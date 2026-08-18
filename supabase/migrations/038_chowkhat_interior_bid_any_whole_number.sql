-- Chowkhat (Mistri Worker) and Modular Kitchen (Interior Work) bids may be any
-- positive whole number (ones place 0–9). Legacy carpenter rows stay exempt.
-- Other services still require rates ending in 0 or 5 unless listed below.
create or replace function public.validate_bid_rates()
returns trigger
language plpgsql
as $$
declare
  rate_key text;
  rate_val numeric;
  rate_keys text[] := array['ground_rate', 'first_rate', 'second_rate'];
  project_service text;
  mistri_details jsonb;
  skip_multiple_of_five boolean;
begin
  select p.service_type::text, p.mistri_details
    into project_service, mistri_details
  from public.projects p
  where p.id = new.project_id;

  skip_multiple_of_five :=
    coalesce(new.service_type::text, '') in (
      'painter', 'electrician', 'carpenter', 'drawing_design', 'false_ceiling_work'
    )
    or coalesce(project_service, '') in (
      'painter', 'electrician', 'carpenter', 'drawing_design', 'false_ceiling_work'
    )
    or (
      coalesce(project_service, '') = 'labour_contractor'
      and (
        coalesce(mistri_details->>'includeDoorWindowFrames', '') = 'true'
        or nullif(trim(coalesce(mistri_details->>'doorWindowFramesQuantity', '')), '') is not null
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
  'Validates bids.rates JSONB floor keys are positive whole numbers. Multiples of 5 required except painter, electrician, drawing_design, interior (false_ceiling_work), legacy carpenter, and Mistri Chowkhat bids.';
