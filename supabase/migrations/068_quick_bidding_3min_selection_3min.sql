-- ================================================================
-- Quick mode: 3-minute bidding window + 3-minute selection window
-- ================================================================
-- Project forms default quick bidding to 3 minutes. After bidding
-- closes, expire_active_projects opens a 3-minute owner selection
-- window (previously 5 or 10 minutes, depending on which migration
-- last defined the function).
-- The insert trigger still only overrides a missing or sub-1-minute
-- bidding end time; that fallback now matches the 3-minute quick mode.
-- ================================================================

create or replace function public.enforce_bidding_ends_at()
returns trigger language plpgsql security definer as $$
begin
  if new.bidding_ends_at is null or new.bidding_ends_at < (now() + interval '1 minute') then
    new.bidding_ends_at := now() + interval '3 minutes';
  end if;
  return new;
end;
$$;

create or replace function public.expire_active_projects()
returns void language plpgsql security definer as $$
begin
  update public.projects
  set    status            = 'frozen_24h',
         selection_ends_at = now() + interval '3 minutes'
  where  status            = 'active_24h'
    and  bidding_ends_at  <= now();
end;
$$;
