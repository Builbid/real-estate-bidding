import { NextResponse } from 'next/server'
import { processAuctionTransitions } from '@/app/actions/auction'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await processAuctionTransitions()
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
