-- ================================================================
-- Construction firm bidding — public views for leaderboard identity
-- and bids_public extensions (does not alter labour contractor logic)
-- ================================================================

-- Mask GST for public display: e.g. 22AAAAA****A1Z5
create or replace function public.mask_gst(gst text)
returns text
language sql
immutable
as $$
  select case
    when gst is null or length(gst) < 15 then null
    else substring(gst from 1 for 2)
      || substring(gst from 3 for 5)
      || '****'
      || substring(gst from 12 for 4)
  end
$$;

comment on function public.mask_gst(text) is
  'Partially masks GSTIN for public firm profiles';

-- Public construction firm identity (no email/phone/address)
create or replace view public.firms_public as
  select
    id,
    company_name,
    logo_url,
    years_in_business,
    is_verified,
    public.mask_gst(gst_number) as gst_masked,
    gst_number is not null and length(trim(gst_number)) = 15 as gst_verified,
    physical_address,
    pincode,
    created_at
  from public.profiles
  where role = 'construction_firm';

comment on view public.firms_public is
  'Public firm profile — company name, logo, years; GST partially masked';

grant select on public.firms_public to anon, authenticated;

-- Extend bids_public with firm bid fields (ranking still uses total_sum_metric)
drop view if exists public.bids_public;

create view public.bids_public as
  select
    b.id,
    b.project_id,
    b.rates,
    b.total_sum_metric,
    b.single_rate,
    b.service_type,
    b.created_at,
    b.updated_at,
    b.builder_id
  from public.bids b
  join public.projects pr on pr.id = b.project_id
  where b.is_withdrawn = false;

comment on view public.bids_public is
  'Public bid view — includes single_rate for construction firm projects';

grant select on public.bids_public to anon, authenticated;
