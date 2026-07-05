-- ─── NOTIFICATIONS TABLE ───────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null,   -- 'builder_selected' | 'you_were_selected'
  title      text        not null,
  message    text        not null,
  project_id uuid        references public.projects(id) on delete cascade,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Users can only read/update their own notifications
create policy "notifications_own_select" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_own_update" on public.notifications
  for update using (auth.uid() = user_id);

-- Only service-role (server actions) can insert
create policy "notifications_insert_service" on public.notifications
  for insert with check (true);

-- Index for fast per-user queries
create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
