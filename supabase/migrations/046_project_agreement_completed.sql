-- Contractual "Projects Approved" flag.
-- Creating a project must NOT set this. It becomes true only when a builder
-- is awarded and the agreement is treated as signed.

alter table public.projects
  add column if not exists agreement_completed boolean not null default false;

comment on column public.projects.agreement_completed is
  'True only after the project is contractually approved / agreement signed. New posts stay false.';

-- Existing awarded projects are already in the signed-agreement state.
update public.projects
set agreement_completed = true
where selected_builder_id is not null
  and status = 'completed'
  and agreement_completed is not true;

create or replace function public.mark_project_agreement_completed()
returns trigger
language plpgsql
as $$
begin
  -- Inserts (create/upload) never auto-approve.
  if tg_op = 'INSERT' then
    if new.selected_builder_id is null then
      new.agreement_completed := false;
    elsif new.status = 'completed' then
      new.agreement_completed := true;
    end if;
    return new;
  end if;

  if new.selected_builder_id is not null
     and (
       new.status = 'completed'
       or old.selected_builder_id is distinct from new.selected_builder_id
     )
  then
    new.agreement_completed := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mark_project_agreement_completed on public.projects;

create trigger trg_mark_project_agreement_completed
before insert or update on public.projects
for each row
execute function public.mark_project_agreement_completed();
