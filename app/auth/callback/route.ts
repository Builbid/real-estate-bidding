export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getDashboardPath } from '@/lib/auth/roles'

/**
 * Supabase email-confirmation callback handler.
 *
 * When a user clicks the confirmation link in their email, Supabase redirects
 * them here with a `code` query param. We exchange it for a session, then
 * forward the user to their role-specific dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Fetch the user's role and redirect to the correct dashboard
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        return NextResponse.redirect(`${origin}${getDashboardPath(profile?.role)}`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
