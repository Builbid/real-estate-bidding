-- ================================================================
-- Timing Update: 7-minute bidding window, 10-minute selection window
-- Replaces the previous 24-hour grace / selection period.
-- ================================================================

-- ─── RE-DEFINE expire_active_projects ───────────────────────────
-- Called on every dashboard page load (owner + builder).
-- Transitions active_24h → frozen_24h and opens a 10-minute
-- selection window for the owner to choose a builder.

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

-- ─── RE-DEFINE expire_frozen_projects ───────────────────────────
-- Marks completed once a builder is selected, or cancels if nobody
-- was chosen within the 10-minute selection window.

create or replace function public.expire_frozen_projects()
returns void language plpgsql security definer as $$
begin
  -- Complete when builder was selected and window has passed
  update public.projects
  set    status = 'completed'
  where  status                = 'frozen_24h'
    and  selection_ends_at    <= now()
    and  selected_builder_id  is not null;

  -- Cancel when nobody was selected within 10 minutes
  update public.projects
  set    status = 'cancelled'
  where  status                = 'frozen_24h'
    and  selection_ends_at    <= now()
    and  selected_builder_id  is null;
end;
$$;
