/** Browser-safe site origin for Supabase auth redirects. */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://builbid.in';
}
