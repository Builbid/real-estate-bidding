-- Strict 3-way account separation: Home Owner / Mistri-Worker / Supervisor-Admin.
--
-- An account may NEVER move between these families (one email = one role family):
--   owner                                                  -> Home Owner
--   labour_contractor, construction_firm, service_provider -> Mistri / Worker
--   admin, field_supervisor                                -> Supervisor / Admin
--
-- Supersedes the trigger function from 056. Cross-family changes are rejected for
-- EVERYONE (including the service role) so no code path can silently convert an
-- Owner into a Supervisor or vice versa. Same-family changes still follow 056's
-- rule (only service role / admins).

create or replace function public.profile_role_family(r text)
returns text
language sql
immutable
as $$
  select case
    when r in ('owner') then 'owner'
    when r in ('labour_contractor', 'construction_firm', 'service_provider') then 'worker'
    when r in ('admin', 'field_supervisor') then 'staff'
    else null
  end;
$$;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_family text;
  new_family text;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  old_family := public.profile_role_family(old.role::text);
  new_family := public.profile_role_family(new.role::text);

  -- Cross-family change: never allowed. Create a separate account with a separate email.
  if old_family is distinct from new_family then
    raise exception
      'Role change from % to % is not allowed: Home Owner, Mistri/Worker and Supervisor/Admin accounts must use separate emails.',
      old.role, new.role
      using errcode = '42501';
  end if;

  -- Same-family change: service role / SQL (no end-user JWT) or a platform admin only.
  if auth.uid() is null then
    return new;
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'admin'
  ) then
    return new;
  end if;

  new.role := old.role;
  return new;
end;
$$;

drop trigger if exists trg_profiles_lock_role on public.profiles;
create trigger trg_profiles_lock_role
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- Emails are already unique per auth user; make sure profiles can't hold the same
-- email (any case) twice, which is what let one address be re-used across roles.
-- (Skipped automatically if existing data already contains case-insensitive duplicates.)
do $$
begin
  create unique index if not exists profiles_email_lower_uidx
    on public.profiles (lower(email))
    where email is not null and email <> '';
exception
  when others then
    raise notice 'profiles_email_lower_uidx not created: %', sqlerrm;
end;
$$;
