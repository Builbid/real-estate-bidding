-- Fix selection window: change from 24 hours to 10 minutes
create or replace function public.expire_active_projects()
returns void language plpgsql security definer as $$
begin
  update public.projects
  set    status            = 'frozen_24h',
         selection_ends_at = now() + interval '10 minutes'
  where  status            = 'active_24h'
    and  bidding_ends_at  <= now();
end;
$$;
