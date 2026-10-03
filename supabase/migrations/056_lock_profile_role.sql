-- Permanent role integrity.
--
-- 1. profiles.role can only be changed by privileged callers (service role /
--    direct SQL with no JWT, or an admin). Ordinary users editing their own
--    profile row can no longer mutate the assigned role.
-- 2. handle_new_user never overwrites an existing profile's role on conflict,
--    understands the 'home_owner' alias, and no longer defaults new accounts
--    to 'labour_contractor' (Mistri Worker) when metadata has no role.

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- No end-user JWT (service role, migrations, SQL editor): allowed.
    if auth.uid() is null then
      return new;
    end if;

    -- Platform admins may reassign roles.
    if exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = 'admin'
    ) then
      return new;
    end if;

    -- Everyone else: silently keep the stored role.
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_lock_role on public.profiles;
create trigger trg_profiles_lock_role
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role_text text;
  v_role      public.user_role;
  v_service   public.service_type;
begin
  v_role_text := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'owner'));

  if v_role_text = 'builder' then
    v_role_text := 'labour_contractor';
  elsif v_role_text in ('home_owner', 'homeowner') then
    v_role_text := 'owner';
  end if;

  -- Never allow self-assigned privileged roles through signup metadata.
  if v_role_text in ('admin', 'field_supervisor') then
    v_role_text := 'owner';
  end if;

  v_role := v_role_text::public.user_role;

  v_service := case
    when v_role = 'labour_contractor' then 'labour_contractor'::public.service_type
    when v_role = 'construction_firm' then 'construction_firm'::public.service_type
    when v_role = 'service_provider' then
      nullif(new.raw_user_meta_data->>'service_type', '')::public.service_type
    else null
  end;

  insert into public.profiles (id, email, full_name, role, service_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_service
  )
  on conflict (id) do update
    set email        = excluded.email,
        full_name    = excluded.full_name,
        -- role intentionally NOT updated: the stored role is authoritative.
        service_type = coalesce(excluded.service_type, public.profiles.service_type);

  return new;
exception
  when others then
    raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
    return new;
end;
$$;
