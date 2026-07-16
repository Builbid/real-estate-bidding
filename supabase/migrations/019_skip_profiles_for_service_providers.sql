-- Skip profiles row for Hire Services signups (they use service_providers only).
-- Fixes carpenters/painters showing as labour_contractor when both rows exist.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role_text text;
  v_role      public.user_role;
  v_service   public.service_type;
  v_hire      text;
begin
  v_role_text := coalesce(new.raw_user_meta_data->>'role', 'labour_contractor');
  v_hire := coalesce(new.raw_user_meta_data->>'hire_service_provider', '');

  if v_role_text = 'service_provider' or v_hire = 'true' then
    return new;
  end if;

  if v_role_text = 'builder' then
    v_role_text := 'labour_contractor';
  end if;

  v_role := v_role_text::public.user_role;

  v_service := case v_role
    when 'labour_contractor' then 'labour_contractor'::public.service_type
    when 'construction_firm' then 'construction_firm'::public.service_type
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
        role         = excluded.role,
        service_type = coalesce(excluded.service_type, public.profiles.service_type);

  return new;
exception
  when others then
    raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
    return new;
end;
$$;
