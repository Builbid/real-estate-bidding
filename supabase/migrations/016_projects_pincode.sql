alter table public.projects
  add column if not exists pincode text;

comment on column public.projects.pincode is 'Project site postal pincode (optional)';
