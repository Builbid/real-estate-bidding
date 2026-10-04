-- Unified Worker Account model.
--
-- Users choose only an Owner Account or a Worker Account. A Worker (stored as
-- 'labour_contractor', or the legacy trade-specific 'service_provider') may view
-- and bid on EVERY project category (Civil/Mistri, plumbing, painting, electrical,
-- earthwork, drawing & design, ...) from a single account.
--
-- Supersedes the bids insert/update policies from 026, which only allowed a bidder
-- to bid on projects whose service_type matched their own profiles.service_type.
-- The separate turnkey Construction Firm line keeps its own 1:1 matching rule.
-- Bid windows are unchanged: only while status = 'active_24h' and before the timer.

drop policy if exists "bids_insert_bidder" on public.bids;
create policy "bids_insert_bidder" on public.bids
  for insert with check (
    auth.uid() = builder_id
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(bids.service_type, pr.service_type)
        and (
          -- Any Worker: every category except turnkey construction-firm projects.
          (public.get_my_role() in ('labour_contractor', 'service_provider')
            and pr.service_type::text <> 'construction_firm')
          or
          -- Construction firms only bid on firm projects.
          (public.get_my_role() = 'construction_firm'
            and pr.service_type::text = 'construction_firm')
        )
        and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );

drop policy if exists "bids_update_bidder_own" on public.bids;
create policy "bids_update_bidder_own" on public.bids
  for update using (
    auth.uid() = builder_id
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and pr.service_type = coalesce(bids.service_type, pr.service_type)
        and (
          (public.get_my_role() in ('labour_contractor', 'service_provider')
            and pr.service_type::text <> 'construction_firm')
          or
          (public.get_my_role() = 'construction_firm'
            and pr.service_type::text = 'construction_firm')
        )
        and pr.status = 'active_24h'
        and pr.bidding_ends_at > now()
    )
  );

comment on policy "bids_insert_bidder" on public.bids is
  'Unified Worker Account: any Worker (labour_contractor / service_provider) may bid on any '
  'non-firm project category; construction firms bid only on firm projects. Bidding must be '
  'active — no grace period.';
