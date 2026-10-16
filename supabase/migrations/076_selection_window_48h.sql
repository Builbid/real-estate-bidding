-- Owner selection stays open for 48 hours after live bidding closes.
-- Owners can also award a bid while bidding is still live; this window
-- is only the time left after bidding_ends_at.

create or replace function public.expire_active_projects()
returns void language plpgsql security definer as $$
begin
  update public.projects
  set    status            = 'frozen_24h',
         selection_ends_at = now() + interval '48 hours'
  where  status            = 'active_24h'
    and  bidding_ends_at  <= now();
end;
$$;
