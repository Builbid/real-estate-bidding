-- Construction firm class tier (A / B / C) declared at registration.
-- Maps to finishing_level: premium = A Class, standard = B Class, basic = C Class.

alter table public.profiles
  add column if not exists construction_class public.finishing_level;

comment on column public.profiles.construction_class is
  'Firm construction class: premium=A, standard=B, basic=C — set at firm registration';

-- Expose on public firm profiles (no PII)
drop view if exists public.firms_public;

create view public.firms_public as
  select
    id,
    company_name,
    logo_url,
    years_in_business,
    construction_class,
    is_verified,
    public.mask_gst(gst_number) as gst_masked,
    gst_number is not null and length(trim(gst_number)) = 15 as gst_verified,
    physical_address,
    pincode,
    created_at
  from public.profiles
  where role = 'construction_firm';

comment on view public.firms_public is
  'Public firm profile — company name, logo, years, construction class; GST partially masked';

grant select on public.firms_public to anon, authenticated;
