-- 24 hours of live bidding, then 24 hours to select. The listing expires
-- 48 hours after posting, or as soon as bidding ends with zero bids.

create or replace function public.expire_active_projects()
returns void
language plpgsql
security definer
as $$
begin
  update public.projects p
  set status = 'expired'
  where p.status = 'active_24h'
    and p.bidding_ends_at <= now()
    and p.selected_builder_id is null
    and not exists (
      select 1
      from public.bids b
      where b.project_id = p.id
        and b.is_withdrawn = false
    );

  update public.projects p
  set status = 'frozen_24h',
      selection_ends_at = least(
        p.bidding_ends_at + interval '24 hours',
        p.created_at + interval '48 hours'
      )
  where p.status = 'active_24h'
    and p.bidding_ends_at <= now()
    and p.selected_builder_id is null
    and exists (
      select 1
      from public.bids b
      where b.project_id = p.id
        and b.is_withdrawn = false
    );

  update public.projects
  set selection_ends_at = least(
        coalesce(selection_ends_at, bidding_ends_at + interval '24 hours'),
        bidding_ends_at + interval '24 hours',
        created_at + interval '48 hours'
      )
  where status = 'frozen_24h'
    and selected_builder_id is null;

  update public.projects p
  set status = 'expired'
  where p.status = 'frozen_24h'
    and p.selected_builder_id is null
    and (
      p.selection_ends_at <= now()
      or p.created_at + interval '48 hours' <= now()
      or not exists (
        select 1
        from public.bids b
        where b.project_id = p.id
          and b.is_withdrawn = false
      )
    );
end;
$$;

create or replace function public.expire_frozen_projects()
returns void
language plpgsql
security definer
as $$
begin
  update public.projects
  set status = 'expired'
  where status = 'frozen_24h'
    and selection_ends_at <= now()
    and selected_builder_id is null;
end;
$$;
