-- Dedicated supervisor role. Must commit before the value is used.
alter type public.user_role add value if not exists 'field_supervisor';
