-- Selecting a worker starts the agreement. It stays in progress until a
-- supervisor or admin explicitly marks the agreement signed. Bidding and
-- selection expiry must not archive those projects.

create or replace function public.mark_project_agreement_completed()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.agreement_completed := new.agreement_status = 'approved_active';
    return new;
  end if;

  if new.agreement_status = 'approved_active' then
    new.agreement_completed := true;
  elsif old.selected_builder_id is distinct from new.selected_builder_id
     and new.agreement_status is null
  then
    new.agreement_completed := false;
  end if;

  return new;
end;
$$;

create or replace function public.expire_frozen_projects()
returns void
language plpgsql
security definer
as $$
begin
  -- Awarded projects stay available for the agreement process.
  update public.projects
  set    status = 'cancelled'
  where  status               = 'frozen_24h'
    and  selection_ends_at   <= now()
    and  selected_builder_id is null;
end;
$$;

-- Awards that were auto-flagged while bidding or selection was still open.
update public.projects
set agreement_completed = false
where agreement_completed = true
  and coalesce(agreement_status, '') <> 'approved_active'
  and status in ('active_24h', 'frozen_24h');

-- Recent awards that were auto-completed when the selection window ended
-- return to the agreement process until a supervisor signs them.
update public.projects
set agreement_completed = false,
    status = 'frozen_24h'
where agreement_completed = true
  and status = 'completed'
  and selected_builder_id is not null
  and coalesce(agreement_status, '') <> 'approved_active'
  and updated_at >= '2026-10-03 14:55:00+00';
