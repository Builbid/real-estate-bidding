-- TESTING: verified field_supervisor accounts can use admin dashboard data.
-- Manual interview / approval is bypassed. Remove the field_supervisor
-- branch from this function before official production.

create or replace function public.is_builbid_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  jwt_email text;
begin
  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if jwt_email = 'builbidcorp@gmail.com' then
    return true;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.is_admin = true
        or p.role::text = 'admin'
        or lower(p.email) = 'builbidcorp@gmail.com'
        or (p.role::text = 'field_supervisor' and p.is_verified = true)
      )
  );
end;
$$;
