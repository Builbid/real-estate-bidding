'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { archiveUnsignedAgreements } from '@/lib/dashboard/archiveUnsignedAgreements'
import { expireProjectWindows } from '@/lib/auction/expireProjects'
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
 * Bidding lasts 24 hours. Selection lasts 24 hours after that, and never past
 * 48 hours from posting. Zero-bid projects expire when bidding ends.
 */
export async function processAuctionTransitions(): Promise<{ archivedAgreementIds: string[] }> {
  const client = await getBestClient()
  await expireProjectWindows(client)

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
  await expireProjectWindows(client, projectId)
}
