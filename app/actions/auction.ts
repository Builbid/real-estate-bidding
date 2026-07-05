'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

const SELECTION_WINDOW_MS = 5 * 60 * 1000   // 5 minutes in ms

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
export async function processAuctionTransitions() {
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
