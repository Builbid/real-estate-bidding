-- Owners can award a worker after bidding closes.
-- UPDATE must not require status = open/active; frozen_24h (and
-- timer-ended active_24h) rows still belong to the owner.

drop policy if exists "projects_update_owner" on public.projects;

create policy "projects_update_owner" on public.projects
  for update
  using (
    auth.uid() = owner_id
    or public.get_my_role() = 'admin'
  )
  with check (
    auth.uid() = owner_id
    or public.get_my_role() = 'admin'
  );
