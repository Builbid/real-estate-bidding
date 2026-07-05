import { createClient } from './server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/types'
import { normalizeRole } from '@/lib/auth/roles'

export interface ResolvedUser {
  supabase: SupabaseClient
  userId: string
  email: string
  role: UserRole
  fullName: string
}

/**
 * Resilient server-side user resolver.
 *
 * 1. getUser()      — validates JWT with Supabase Auth server
 * 2. getSession()   — reads JWT from cookie (fallback if network blips)
 * 3. user_metadata  — role/name from the JWT itself (fallback if DB has RLS issues)
 *
 * This means the auth guard works correctly even when the `profiles`
 * RLS policy has a bug (e.g. infinite recursion), so users can still
 * log in while the database is being fixed.
 */
export async function getAuthUser(): Promise<ResolvedUser> {
  const supabase = await createClient()

  // ── 1. Verify JWT with Supabase Auth ────────────────────────────
  let userId: string | null  = null
  let email: string          = ''
  let meta: Record<string, string> = {}

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.id) {
    userId = user.id
    email  = user.email ?? ''
    meta   = (user.user_metadata ?? {}) as Record<string, string>
  } else {
    // ── 2. Fallback: read JWT from cookie without network call ──────
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      userId = session.user.id
      email  = session.user.email ?? ''
      meta   = (session.user.user_metadata ?? {}) as Record<string, string>
    }
  }

  if (!userId) redirect('/login')

  // ── 3. Role from JWT metadata (works even if DB/RLS is broken) ──
  const metaRole = normalizeRole(meta.role)
  const fullName  = meta.full_name ?? ''

  return { supabase, userId, email, role: metaRole, fullName }
}
