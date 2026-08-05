-- ================================================================
-- Trade Service Bidding — retire "Hire Services" callback flow in
-- favour of rate/sqft auctions for Painter, Plumber, Electrician,
-- Carpenter, False Ceiling Work, and Earthwork.
--
-- Mirrors the labour_contractor bidding pattern exactly:
--   - One shared 'service_provider' role in profiles.
--   - profiles.service_type stores which trade the provider practises
--     (reusing the same column construction_firm/labour_contractor use).
--   - projects.service_type is extended with each trade value.
--   - bids use the existing rates/single_rate columns (one rate/sqft).
--
-- Additive only — old service_providers / callback_requests tables and
-- data are left untouched (not read by the new flow going forward).
-- ================================================================

-- ─── PART 1: user_role — add the shared bidder role ─────────────────

alter type public.user_role add value if not exists 'service_provider';

-- ─── PART 2: service_type — add one value per trade ─────────────────

alter type public.service_type add value if not exists 'painter';
alter type public.service_type add value if not exists 'plumber';
alter type public.service_type add value if not exists 'electrician';
alter type public.service_type add value if not exists 'carpenter';
alter type public.service_type add value if not exists 'false_ceiling_work';
alter type public.service_type add value if not exists 'earthwork';

comment on type public.service_type is
  'labour_contractor / construction_firm (construction bidding) or a trade '
  '(painter, plumber, electrician, carpenter, false_ceiling_work, earthwork) '
  'for simplified rate/sqft trade bidding';

-- ─── PART 3: SIGNUP TRIGGER — create a real profile row for trade providers ──
-- Previously (migration 019) 'service_provider' signups were skipped entirely
-- because Hire Services stored providers in a separate table. Trade bidders
-- now need a normal profiles row exactly like labour_contractor/construction_firm.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role_text text;
  v_role      public.user_role;
  v_service   public.service_type;
begin
  v_role_text := coalesce(new.raw_user_meta_data->>'role', 'labour_contractor');

  if v_role_text = 'builder' then
    v_role_text := 'labour_contractor';
  end if;

  v_role := v_role_text::public.user_role;

  v_service := case
    when v_role = 'labour_contractor' then 'labour_contractor'::public.service_type
    when v_role = 'construction_firm' then 'construction_firm'::public.service_type
    when v_role = 'service_provider' then
      nullif(new.raw_user_meta_data->>'service_type', '')::public.service_type
    else null
  end;

  insert into public.profiles (id, email, full_name, role, service_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    v_service
  )
  on conflict (id) do update
    set email        = excluded.email,
        full_name    = excluded.full_name,
        role         = excluded.role,
        service_type = coalesce(excluded.service_type, public.profiles.service_type);

  return new;
exception
  when others then
    raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- ─── PART 4: BIDS RLS — generalize bidder matching to cover all trades ───
-- Replaces the labour_contractor/construction_firm-only checks from
-- migration 014/025 with a generic "bidder's service_type matches the
-- project's service_type" rule, so it automatically covers every trade
-- without needing one policy branch per trade. No grace period: bids can
-- only be placed/updated while status = active_24h and before the timer.

drop policy if exists "bids_insert_bidder" on public.bids;
create policy "bids_insert_bidder" on public.bids
  for insert with check (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'construction_firm', 'service_provider')
    and public.get_my_service_type() is not null
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(bids.service_type, pr.service_type)
        and pr.service_type::text = public.get_my_service_type()
        and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );

drop policy if exists "bids_update_bidder_own" on public.bids;
create policy "bids_update_bidder_own" on public.bids
  for update using (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'construction_firm', 'service_provider')
    and public.get_my_service_type() is not null
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(bids.service_type, pr.service_type)
        and pr.service_type::text = public.get_my_service_type()
        and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );

comment on policy "bids_insert_bidder" on public.bids is
  'Any bidder role (labour_contractor / construction_firm / service_provider trade) may '
  'bid only on projects whose service_type matches their own profiles.service_type, and '
  'only while bidding is active — no grace period.';
