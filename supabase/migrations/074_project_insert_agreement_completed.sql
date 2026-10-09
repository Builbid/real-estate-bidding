-- Creating a project must not write null into agreement_completed.
-- On INSERT, `agreement_status = 'approved_active'` is null when the status
-- column is null, and assigning that result violates the not-null constraint.

alter table public.projects
  alter column agreement_completed set default false;

create or replace function public.mark_project_agreement_completed()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.agreement_completed := coalesce(new.agreement_status = 'approved_active', false);
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
