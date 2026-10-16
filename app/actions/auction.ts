'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { archiveUnsignedAgreements } from '@/lib/dashboard/archiveUnsignedAgreements'
import { SELECTION_WINDOW_MS } from '@/lib/auction/selectionWindow'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Returns admin client if the service-role key is available, otherwise the
 *  regular server client (works for the logged-in user's own projects). */
async function getBestClient(): Promise<SupabaseClient> {
  try {
    return createAdminClient()
  } catch {
    return await createClient()
  }
}

/**
 * Runs on every owner page load.
 * active_24h → frozen_24h  when bidding_ends_at has passed
 * frozen_24h → cancelled   when selection_ends_at has passed and no builder chosen
 */
export async function processAuctionTransitions(): Promise<{ archivedAgreementIds: string[] }> {
  const client = await getBestClient()
  const now    = new Date().toISOString()

  await client
    .from('projects')
    .update({
      status:            'frozen_24h',
      selection_ends_at: new Date(Date.now() + SELECTION_WINDOW_MS).toISOString(),
    })
    .eq('status', 'active_24h')
    .lt('bidding_ends_at', now)

  await client
    .from('projects')
    .update({ status: 'cancelled' })
    .eq('status', 'frozen_24h')
    .lt('selection_ends_at', now)
    .is('selected_builder_id', null)

  let archivedAgreementIds: string[] = []
  try {
    archivedAgreementIds = await archiveUnsignedAgreements()
  } catch (err) {
    console.error('[auction] archive unsigned agreements failed:', err)
  }

  const rpc = await client.rpc('archive_stale_unsigned_agreements')
  if (rpc.error && !/archive_stale_unsigned_agreements|does not exist|schema cache/i.test(rpc.error.message)) {
    console.error('[auction] archive_stale_unsigned_agreements failed:', rpc.error.message)
  }

  return { archivedAgreementIds }
}

/**
 * Transitions a single project.
 * Called by AuctionCountdown the moment a timer hits zero on the client.
 */
export async function triggerProjectTransition(projectId: string) {
  const client = await getBestClient()
  const now    = new Date()

  const { data: project } = await client
    .from('projects')
    .select('status, bidding_ends_at, selection_ends_at, selected_builder_id')
    .eq('id', projectId)
    .single()

  if (!project) return

  if (
    project.status === 'active_24h' &&
    new Date(project.bidding_ends_at) <= now
  ) {
    await client
      .from('projects')
      .update({
        status:            'frozen_24h',
        selection_ends_at: new Date(Date.now() + SELECTION_WINDOW_MS).toISOString(),
      })
      .eq('id', projectId)
  }

  if (
    project.status === 'frozen_24h' &&
    project.selection_ends_at &&
    new Date(project.selection_ends_at) <= now &&
    !project.selected_builder_id
  ) {
    await client
      .from('projects')
      .update({ status: 'cancelled' })
      .eq('id', projectId)
  }
}
