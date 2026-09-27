-- Supervisor identity linked to an existing auth user.
-- Distinct from homeowner and contractor columns on public.profiles.
-- Service role only. Apply in the Supabase SQL editor if signup reports this table is missing.

create table if not exists public.supervisors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  supervisor_name text not null,
  phone text not null,
  staff_position text not null,
  id_document_number text not null,
  id_front_path text not null,
  id_back_path text not null,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.supervisors is
  'Supervisor name, ID documents, and photo linked by auth.uid(). Does not replace homeowner or contractor profile data.';

alter table public.supervisors enable row level security;

drop policy if exists "supervisors_deny_all" on public.supervisors;
create policy "supervisors_deny_all"
  on public.supervisors
  for all
  using (false)
  with check (false);
