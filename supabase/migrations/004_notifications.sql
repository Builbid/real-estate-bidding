-- ================================================================
-- In-App Notifications System
-- ================================================================
-- Creates a notifications table, RLS so each user sees only their
-- own rows, realtime subscription, and a DB trigger that fires
-- when a project owner selects a builder (selected_builder_id
-- transitions from NULL to a valid UUID).
-- ================================================================

-- ─── TABLE ──────────────────────────────────────────────────────

create table public.notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null,
  -- Known types:
  --   'you_were_selected'  → sent to the selected builder
  --   'builder_selected'   → confirmation sent to the project owner
  title      text        not null,
  body       text,
  data       jsonb,
  -- Suggested shape: { project_id: uuid, project_title: text }
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Per-user in-app notification feed';

-- ─── INDEXES ────────────────────────────────────────────────────

create index idx_notifications_user_id    on public.notifications(user_id);
create index idx_notifications_is_read    on public.notifications(user_id, is_read) where is_read = false;
create index idx_notifications_created_at on public.notifications(created_at desc);

-- ─── ROW-LEVEL SECURITY ─────────────────────────────────────────

alter table public.notifications enable row level security;

-- Users can read and update (mark read) only their own notifications
create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notif_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- Only DB functions (security definer) can insert notifications
create policy "notif_insert_service" on public.notifications
  for insert with check (true);

-- ─── REALTIME ───────────────────────────────────────────────────

alter publication supabase_realtime add table public.notifications;

-- ─── TRIGGER FUNCTION ───────────────────────────────────────────
-- Fires after a project row is updated. When selected_builder_id
-- transitions from NULL to a real UUID, two notification rows are
-- inserted: one for the selected builder, one confirming to the owner.

create or replace function public.notify_builder_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire on the initial selection (NULL → value)
  if new.selected_builder_id is not null and old.selected_builder_id is null then

    -- Notify the selected builder
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.selected_builder_id,
      'you_were_selected',
      'You were selected!',
      'Congratulations — the project owner has chosen you for "' || new.title || '". Check your project dashboard for next steps.',
      jsonb_build_object('project_id', new.id, 'project_title', new.title)
    );

    -- Send confirmation to the project owner
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.owner_id,
      'builder_selected',
      'Builder selection confirmed',
      'You have successfully selected a builder for "' || new.title || '".',
      jsonb_build_object('project_id', new.id, 'project_title', new.title)
    );

  end if;
  return new;
end;
$$;

create trigger trg_notify_builder_selection
  after update on public.projects
  for each row
  execute function public.notify_builder_selection();
