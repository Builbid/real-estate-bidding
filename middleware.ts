import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Match ONLY paths that need session-aware handling.
   * Explicitly exclude:
   *   - _next/static, _next/image  (Next.js internals)
   *   - favicon.ico and common static assets
   *   - /auth/**  (Supabase auth callbacks — must never be intercepted)
   *   - /api/**   (API routes handle their own auth)
   *   - All root-level public pages (/, /login, /register, /project/*)
   *
   * We only really need the middleware to run on /dashboard/* so that
   * unauthenticated users are redirected to /login.
   */
  matcher: ['/dashboard/:path*'],
};
