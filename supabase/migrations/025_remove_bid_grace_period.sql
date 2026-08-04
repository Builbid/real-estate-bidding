-- ================================================================
-- Remove the bid "grace period" — no price changes after bidding closes
-- ================================================================
-- Migrations 003/006/014 let bidders keep submitting or updating bids
-- during the frozen_24h owner-selection window (a grace period after
-- bidding_ends_at). Per product decision, nobody may change bid pricing
-- once the bidding window has ended — this replaces those insert/update
-- policies, dropping the frozen_24h branch entirely so writes are only
-- allowed while the project is still active_24h and bidding_ends_at is
-- in the future.
-- ================================================================

-- ── BIDS INSERT ─────────────────────────────────────────────────

drop policy if exists "bids_insert_bidder" on public.bids;

create policy "bids_insert_bidder" on public.bids
  for insert with check (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'construction_firm')
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(bids.service_type, pr.service_type)
        and (
          (public.get_my_role() = 'labour_contractor'
            and pr.service_type = 'labour_contractor')
          or
          (public.get_my_role() = 'construction_firm'
            and pr.service_type = 'construction_firm')
        )
        and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );

-- ── BIDS UPDATE ─────────────────────────────────────────────────

drop policy if exists "bids_update_bidder_own" on public.bids;

create policy "bids_update_bidder_own" on public.bids
  for update using (
    auth.uid() = builder_id
    and public.get_my_role() in ('labour_contractor', 'construction_firm')
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(bids.service_type, pr.service_type)
        and (
          (public.get_my_role() = 'labour_contractor'
            and pr.service_type = 'labour_contractor')
          or
          (public.get_my_role() = 'construction_firm'
            and pr.service_type = 'construction_firm')
        )
        and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );
