-- ================================================================
-- Allow project owners to delete their own projects.
-- Cascading foreign keys on bids, builder_ratings, and notifications
-- automatically clean up all child rows on delete.
-- ================================================================

create policy "projects_delete_owner" on public.projects
  for delete using (auth.uid() = owner_id);
