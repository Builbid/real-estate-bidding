-- ================================================================
-- FIX: Infinite recursion in profiles RLS policy
-- ================================================================
-- Root cause: "profiles_admin_all" policy queries public.profiles
-- from inside a policy ON public.profiles → PostgreSQL recursion.
--
-- Fix: replace all role-checking subqueries with a SECURITY DEFINER
-- function.  Security-definer functions run as the function owner
-- (postgres superuser) which bypasses RLS entirely — no recursion.
-- ================================================================

-- Step 1: Create the helper function
create or replace function public.get_my_role()
returns text
language sql
security definer        -- runs as superuser → bypasses RLS → no recursion
stable
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

-- ── PROFILES ────────────────────────────────────────────────────

-- Drop the recursive policy
drop policy if exists "profiles_admin_all" on public.profiles;

-- Replace it with one that calls the security-definer function
create policy "profiles_admin_all" on public.profiles
  for all using (public.get_my_role() = 'admin');

-- ── PROJECTS ────────────────────────────────────────────────────

drop policy if exists "projects_insert_owner" on public.projects;
create policy "projects_insert_owner" on public.projects
  for insert with check (
    auth.uid() = owner_id and public.get_my_role() = 'owner'
  );

drop policy if exists "projects_update_owner" on public.projects;
create policy "projects_update_owner" on public.projects
  for update using (
    auth.uid() = owner_id or public.get_my_role() = 'admin'
  );

drop policy if exists "projects_delete_admin" on public.projects;
create policy "projects_delete_admin" on public.projects
  for delete using (public.get_my_role() = 'admin');

-- ── BIDS ────────────────────────────────────────────────────────

drop policy if exists "bids_insert_builder" on public.bids;
create policy "bids_insert_builder" on public.bids
  for insert with check (
    auth.uid() = builder_id and public.get_my_role() = 'builder'
  );

drop policy if exists "bids_admin_all" on public.bids;
create policy "bids_admin_all" on public.bids
  for all using (public.get_my_role() = 'admin');

-- ── AUDIT LOGS ──────────────────────────────────────────────────

drop policy if exists "audit_logs_admin_only" on public.audit_logs;
create policy "audit_logs_admin_only" on public.audit_logs
  for all using (public.get_my_role() = 'admin');

-- ── TRIGGER FIX ─────────────────────────────────────────────────
-- Recreate handle_new_user with explicit error handling so a
-- duplicate-key or other DB error doesn't break the entire sign-up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'builder')::user_role
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = excluded.full_name,
        role      = excluded.role;
  return new;
exception
  when others then
    -- Log the error but don't fail the auth.users insert
    raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
    return new;
end;
$$;
