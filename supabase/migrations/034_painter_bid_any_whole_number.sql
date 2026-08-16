-- Painter bids may be any positive whole number (e.g. 82, 87, 103).
-- Other services still require rates ending in 0 or 5.
-- Also treat the linked project as painter when bids.service_type is null.
create or replace function public.validate_bid_rates()
returns trigger
language plpgsql
as $$
declare
  rate_key text;
  rate_val numeric;
  rate_keys text[] := array['ground_rate', 'first_rate', 'second_rate'];
  project_service text;
  skip_multiple_of_five boolean;
begin
  select p.service_type::text into project_service
  from public.projects p
  where p.id = new.project_id;

  skip_multiple_of_five :=
    coalesce(new.service_type::text, '') = 'painter'
    or coalesce(project_service, '') = 'painter';

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
  'Validates bids.rates JSONB floor keys are positive whole numbers. Multiples of 5 required except painter bids.';
