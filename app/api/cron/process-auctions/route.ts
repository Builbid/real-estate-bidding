import { NextResponse } from 'next/server'
import { processAuctionTransitions } from '@/app/actions/auction'
import { retryPendingZohoLeads } from '@/lib/zoho'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await processAuctionTransitions()
  try {
    await retryPendingZohoLeads()
  } catch (err) {
    console.error('[zoho-crm] retry pass failed', err instanceof Error ? err.message : 'unknown')
  }
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
