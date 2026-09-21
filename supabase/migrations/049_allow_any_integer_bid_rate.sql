-- Allow any positive integer bid rate (₹1 step). Remove the historical
-- multiple-of-5 constraint that rejected values like 141, 142, 152, 153.

create or replace function public.validate_bid_rates()
returns trigger
language plpgsql
as $$
declare
  rate_key text;
  rate_val numeric;
  rate_keys text[] := array['ground_rate', 'first_rate', 'second_rate', 'third_rate'];
  mistri_scoped boolean;
begin
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
    end if;
  end loop;

  return new;
end;
$$;

comment on function public.validate_bid_rates() is
  'Validates bids.rates JSONB floor keys are whole numbers. Any positive integer (₹1 step) is accepted. Unused 0 keys are allowed on Mistri scoped bids.';
