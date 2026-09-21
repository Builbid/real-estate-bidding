-- Public project IDs: 4 letters + 4 digits, interleaved (e.g. K7M2Q9P1).
-- Stored in projects.numeric_id and shown as the project ID in the admin portal.

create or replace function public.generate_numeric_project_id()
returns text
language plpgsql
as $$
declare
  letters constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
  n int;
  i int;
begin
  for n in 1..80 loop
    candidate := '';
    for i in 1..4 loop
      candidate := candidate
        || substr(letters, 1 + floor(random() * length(letters))::int, 1)
        || (floor(random() * 10)::int)::text;
    end loop;
    if not exists (select 1 from public.projects where numeric_id = candidate) then
      return candidate;
    end if;
  end loop;

  raise exception 'Could not allocate a unique public project ID';
end;
$$;

create or replace function public.set_project_numeric_id()
returns trigger
language plpgsql
as $$
begin
  if new.numeric_id is null or btrim(new.numeric_id) = '' then
    new.numeric_id := public.generate_numeric_project_id();
  else
    new.numeric_id := upper(btrim(new.numeric_id));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projects_numeric_id on public.projects;
create trigger trg_projects_numeric_id
  before insert or update of numeric_id on public.projects
  for each row execute function public.set_project_numeric_id();

alter table public.projects
  drop constraint if exists projects_numeric_id_format;

do $$
declare
  r record;
begin
  for r in
    select id
    from public.projects
    where numeric_id is null
       or btrim(numeric_id) = ''
       or numeric_id !~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9][A-Z][0-9]$'
  loop
    update public.projects
    set numeric_id = public.generate_numeric_project_id()
    where id = r.id;
  end loop;
end $$;

alter table public.projects
  add constraint projects_numeric_id_format
  check (
    numeric_id is null
    or numeric_id ~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9][A-Z][0-9]$'
  );

update public.project_documents d
set numeric_project_id = p.numeric_id
from public.projects p
where d.project_id = p.id
  and p.numeric_id is not null
  and d.numeric_project_id is distinct from p.numeric_id;

comment on column public.projects.numeric_id is
  'Public project ID shown in the admin portal: 4 letters + 4 digits (e.g. K7M2Q9P1). Linked 1:1 with projects.id.';

comment on function public.generate_numeric_project_id() is
  'Allocates a unique public project ID with exactly 4 A–Z letters and 4 digits.';
