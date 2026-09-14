/** Supabase SSR session cookies, excluding the PKCE verifier. */
export function isSupabaseAuthCookieName(name: string): boolean {
  return name.includes('-auth-token') && !name.includes('code-verifier');
}

export function hasSupabaseAuthCookie(
  cookies: Array<{ name: string; value?: string }>,
): boolean {
  return cookies.some((cookie) => isSupabaseAuthCookieName(cookie.name) && Boolean(cookie.value));
}

export function documentHasSupabaseAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => {
    const name = part.trim().split('=')[0] ?? '';
    return isSupabaseAuthCookieName(name);
  });
}
