-- Enforce whole-number bid rates ending in 0 or 5 (multiples of 5).
-- Applies to ground_rate, first_rate, and second_rate keys inside bids.rates JSONB.

create or replace function public.validate_bid_rates()
returns trigger
language plpgsql
as $$
declare
  rate_key text;
  rate_val numeric;
  rate_keys text[] := array['ground_rate', 'first_rate', 'second_rate'];
begin
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

      if mod(rate_val::bigint, 5) != 0 then
        raise exception 'bid_rate_must_end_in_0_or_5: % must end in 0 or 5 (got %)', rate_key, rate_val
          using errcode = 'check_violation';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validate_bid_rates_trigger on public.bids;

create trigger validate_bid_rates_trigger
  before insert or update of rates on public.bids
  for each row
  execute function public.validate_bid_rates();

comment on function public.validate_bid_rates() is
  'Validates bids.rates JSONB floor keys are positive whole numbers divisible by 5.';
