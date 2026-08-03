-- Firms define what Class A / B / C packages include (all three required at signup).
-- Replaces single construction_class selection from migration 020.

alter table public.profiles
  add column if not exists construction_class_packages jsonb;

comment on column public.profiles.construction_class_packages is
  'Firm-defined package scope per class: { premium, standard, basic } description strings';

-- Drop view first — it depends on construction_class from migration 020
drop view if exists public.firms_public;

alter table public.profiles
  drop column if exists construction_class;

create view public.firms_public as
  select
    id,
    company_name,
    logo_url,
    years_in_business,
    construction_class_packages,
    is_verified,
    public.mask_gst(gst_number) as gst_masked,
    gst_number is not null and length(trim(gst_number)) = 15 as gst_verified,
    physical_address,
    pincode,
    created_at
  from public.profiles
  where role = 'construction_firm';

comment on view public.firms_public is
  'Public firm profile — company name, logo, years, Class A/B/C package descriptions';

grant select on public.firms_public to anon, authenticated;
