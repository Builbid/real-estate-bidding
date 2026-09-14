import { createClient } from './server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/types'
import {
  needsServiceProviderLookup,
  roleFromUserMetadata,
} from '@/lib/auth/roles'

async function resolveUserRole(
  supabase: SupabaseClient,
  userId: string,
  meta: Record<string, unknown>,
): Promise<UserRole> {
  const fromMeta = roleFromUserMetadata(meta)
  if (fromMeta && !needsServiceProviderLookup(fromMeta)) {
    return fromMeta
  }

  const { data: sp } = await supabase
    .from('service_providers')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (sp) return 'service_provider'
  return fromMeta ?? 'labour_contractor'
}

export interface ResolvedUser {
  supabase: SupabaseClient
  userId: string
  email: string
  role: UserRole
  fullName: string
}

/**
 * Session from the JWT cookie. Proxy refreshes tokens on protected routes.
 * Role comes from JWT metadata unless the labour-contractor / provider case
 * still needs a service_providers lookup.
 */
export async function getAuthUser(): Promise<ResolvedUser> {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user?.id) {
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
    const role = await resolveUserRole(supabase, session.user.id, meta)
    return {
      supabase,
      userId: session.user.id,
      email: session.user.email ?? '',
      role,
      fullName: (meta.full_name as string | undefined) ?? '',
    }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.id) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const role = await resolveUserRole(supabase, user.id, meta)
    return {
      supabase,
      userId: user.id,
      email: user.email ?? '',
      role,
      fullName: (meta.full_name as string | undefined) ?? '',
    }
  }

  redirect('/login')
}
