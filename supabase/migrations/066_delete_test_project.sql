-- Temporary test cleanup: staff can remove a project, including its document backup rows.
-- The document trigger still blocks ordinary deletes. This function sets a transaction-local
-- flag that the trigger honours, then deletes the project (child rows cascade).

create or replace function public.protect_project_document_backup()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('builbid.allow_document_delete', true) = 'on' then
      return old;
    end if;
    raise exception 'Project documents are retained as an immutable BuilBid backup and cannot be deleted.';
  end if;

  if not public.is_builbid_admin() then
    new.project_id := old.project_id;
    new.numeric_project_id := old.numeric_project_id;
    new.project_name := old.project_name;
    new.document_type := old.document_type;
    new.file_name := old.file_name;
    new.storage_path := old.storage_path;
    new.file_url := old.file_url;
    new.mime_type := old.mime_type;
    new.owner_id := old.owner_id;
    new.worker_id := old.worker_id;
    new.created_at := old.created_at;

    if auth.uid() = old.owner_id then
      new.worker_deleted := old.worker_deleted;
    elsif auth.uid() = old.worker_id then
      new.owner_deleted := old.owner_deleted;
    end if;

    if old.owner_deleted then
      new.owner_deleted := true;
    end if;
    if old.worker_deleted then
      new.worker_deleted := true;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.delete_test_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'Project not found';
  end if;

  perform set_config('builbid.allow_document_delete', 'on', true);
  delete from public.project_documents where project_id = p_project_id;
  delete from public.projects where id = p_project_id;
end;
$$;

revoke all on function public.delete_test_project(uuid) from public, anon, authenticated;
grant execute on function public.delete_test_project(uuid) to service_role;
