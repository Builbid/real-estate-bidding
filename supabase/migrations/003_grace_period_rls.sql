-- ================================================================
-- Grace Period: Allow builders to submit/update bids during frozen_24h
-- ================================================================
-- During the frozen_24h phase, selection_ends_at marks the owner's
-- 24-hour selection window. Builders may still submit or update their
-- bid during this window (grace period), giving late participants a
-- final chance to enter before the owner makes a selection.
--
-- Replaces the bid write policies from migration 002.
-- ================================================================

-- ── BIDS INSERT ─────────────────────────────────────────────────

drop policy if exists "bids_insert_builder" on public.bids;

create policy "bids_insert_builder" on public.bids
  for insert with check (
    auth.uid() = builder_id
    and public.get_my_role() = 'builder'
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and (
          -- Normal active bidding window
          (pr.status = 'active_24h' and pr.bidding_ends_at > now())
          or
          -- Grace period: frozen_24h but selection window still open
          (pr.status = 'frozen_24h' and pr.selection_ends_at is not null and pr.selection_ends_at > now())
        )
    )
  );

-- ── BIDS UPDATE ─────────────────────────────────────────────────

drop policy if exists "bids_update_builder_own" on public.bids;

create policy "bids_update_builder_own" on public.bids
  for update using (
    auth.uid() = builder_id
    and exists (
      select 1 from public.projects pr
      where pr.id = bids.project_id
        and (
          (pr.status = 'active_24h' and pr.bidding_ends_at > now())
          or
          (pr.status = 'frozen_24h' and pr.selection_ends_at is not null and pr.selection_ends_at > now())
        )
    )
  );
