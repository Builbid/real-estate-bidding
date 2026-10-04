export function isNewProjectPath(pathname: string): boolean {
  return (
    pathname === '/dashboard/owner/new-project' ||
    pathname.startsWith('/dashboard/owner/new-project/')
  );
}

export function isNewProjectHref(href: string, origin?: string): boolean {
  try {
    const url = new URL(href, origin ?? 'https://builbid.in');
    return isNewProjectPath(url.pathname);
  } catch {
    return false;
  }
}

/** Owner Dashboard — the new project appears there under "Live bidding" with full controls. */
export const OWNER_DASHBOARD_PATH = '/dashboard/owner';

/**
 * Where an owner lands right after submitting a project: always the Owner Dashboard
 * (never the standalone project detail view). The argument is kept for call-site compatibility.
 */
export function getPostSubmitPath(_projectId?: string | null): string {
  return OWNER_DASHBOARD_PATH;
}

/** Delay before the success screen auto-redirects (ms). */
export const POST_SUBMIT_REDIRECT_MS = 2500;
