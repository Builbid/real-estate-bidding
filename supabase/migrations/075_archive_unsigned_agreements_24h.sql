-- Unsigned Agreement Process Running rows leave the active dashboards
-- 24 hours after the owner selects a worker, unless a site-visit checklist
-- was saved or the agreement was signed.

alter table public.projects
  add column if not exists builder_selected_at timestamptz;

comment on column public.projects.builder_selected_at is
  'When the owner selected a worker. Unsigned agreements with no site-visit checklist are archived 24 hours after this.';

update public.projects
set builder_selected_at = coalesce(updated_at, created_at)
where selected_builder_id is not null
  and builder_selected_at is null;

create or replace function public.stamp_builder_selected_at()
returns trigger
language plpgsql
as $$
begin
  if new.selected_builder_id is not null
     and new.builder_selected_at is null
     and (tg_op = 'INSERT' or old.selected_builder_id is null)
  then
    new.builder_selected_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_builder_selected_at on public.projects;
create trigger trg_stamp_builder_selected_at
before insert or update on public.projects
for each row
execute function public.stamp_builder_selected_at();

create or replace function public.archive_stale_unsigned_agreements()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects p
  set status = 'cancelled'
  where p.selected_builder_id is not null
    and p.status is distinct from 'cancelled'
    and coalesce(p.agreement_status, '') not in ('approved_active', 'signed', 'completed')
    and p.agreement_completed is not true
    and coalesce(p.builder_selected_at, p.updated_at, p.created_at) <= now() - interval '24 hours'
    and not exists (
      select 1
      from public.project_site_visits v
      where v.project_id = p.id
    )
    and not exists (
      select 1
      from public.project_documents d
      where d.project_id = p.id
        and d.document_type = 'site_checklist'
    )
    and not exists (
      select 1
      from public.project_digital_contracts c
      where c.project_id = p.id
        and (
          c.status = 'signed'
          or c.approved_at is not null
        )
    );
end;
$$;

revoke all on function public.archive_stale_unsigned_agreements() from public;
grant execute on function public.archive_stale_unsigned_agreements() to authenticated, service_role;
