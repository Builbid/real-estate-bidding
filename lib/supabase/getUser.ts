import { createClient } from './server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/types'
import { normalizeRole } from '@/lib/auth/roles'

function resolveRoleFromMetadata(meta: Record<string, unknown>): UserRole {
  if (meta.role === 'service_provider') return 'service_provider'
  const flag = meta.hire_service_provider
  if (flag === true || flag === 'true') return 'service_provider'
  return normalizeRole(meta.role as string | undefined)
}

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

  // Session from cookie — proxy already refreshed JWT on protected routes.
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user?.id) {
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
    return {
      supabase,
      userId: session.user.id,
      email: session.user.email ?? '',
      role: resolveRoleFromMetadata(meta),
      fullName: (meta.full_name as string | undefined) ?? '',
    }
  }

  // Fallback: network validate (e.g. first load without proxy refresh)
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.id) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    return {
      supabase,
      userId: user.id,
      email: user.email ?? '',
      role: resolveRoleFromMetadata(meta),
      fullName: (meta.full_name as string | undefined) ?? '',
    }
  }

  redirect('/login')
}
