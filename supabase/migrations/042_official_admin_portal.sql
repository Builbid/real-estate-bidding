-- ================================================================
-- Official Admin Portal setup
-- ================================================================
-- Adds is_admin flag, is_builbid_admin() helper, and RLS policies
-- granting full access to the official BuilBid staff account.
-- ================================================================

-- 1) Admin flag on profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Official BuilBid staff flag. Prefer is_builbid_admin() for RLS checks.';

create index if not exists profiles_is_admin_idx
  on public.profiles (is_admin)
  where is_admin = true;

-- Promote official corp inbox (must already exist in auth.users / profiles)
update public.profiles
set
  is_admin = true,
  role = 'admin',
  updated_at = now()
where lower(email) = lower('builbidcorp@gmail.com');

-- 2) Security-definer helper — avoids RLS recursion on profiles
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
        or p.role = 'admin'
        or lower(p.email) = 'builbidcorp@gmail.com'
      )
  );
end;
$$;

comment on function public.is_builbid_admin() is
  'True when the current JWT email is builbidcorp@gmail.com or the profile is flagged admin.';

grant execute on function public.is_builbid_admin() to authenticated;
grant execute on function public.is_builbid_admin() to anon;

-- 3) Universal admin RLS (additive — does not remove existing policies)

-- profiles
drop policy if exists "profiles_builbid_admin_all" on public.profiles;
create policy "profiles_builbid_admin_all"
  on public.profiles
  for all
  using (public.is_builbid_admin())
  with check (public.is_builbid_admin());

-- projects
drop policy if exists "projects_builbid_admin_all" on public.projects;
create policy "projects_builbid_admin_all"
  on public.projects
  for all
  using (public.is_builbid_admin())
  with check (public.is_builbid_admin());

-- bids
drop policy if exists "bids_builbid_admin_all" on public.bids;
create policy "bids_builbid_admin_all"
  on public.bids
  for all
  using (public.is_builbid_admin())
  with check (public.is_builbid_admin());

-- service_providers (trade specialists directory)
drop policy if exists "service_providers_builbid_admin_all" on public.service_providers;
create policy "service_providers_builbid_admin_all"
  on public.service_providers
  for all
  using (public.is_builbid_admin())
  with check (public.is_builbid_admin());

-- audit_logs (if present)
do $$
begin
  if to_regclass('public.audit_logs') is not null then
    execute 'drop policy if exists "audit_logs_builbid_admin_all" on public.audit_logs';
    execute $pol$
      create policy "audit_logs_builbid_admin_all"
        on public.audit_logs
        for all
        using (public.is_builbid_admin())
        with check (public.is_builbid_admin())
    $pol$;
  end if;
end $$;

-- builder_portfolio (if present)
do $$
begin
  if to_regclass('public.builder_portfolio') is not null then
    execute 'drop policy if exists "builder_portfolio_builbid_admin_all" on public.builder_portfolio';
    execute $pol$
      create policy "builder_portfolio_builbid_admin_all"
        on public.builder_portfolio
        for all
        using (public.is_builbid_admin())
        with check (public.is_builbid_admin())
    $pol$;
  end if;
end $$;
