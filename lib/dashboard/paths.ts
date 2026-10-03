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

/** Where an owner lands right after submitting a project: its overview page, or home as a fallback. */
export function getPostSubmitPath(projectId?: string | null): string {
  return projectId ? `/dashboard/owner/project/${projectId}` : '/';
}

/** Delay before the success screen auto-redirects (ms). */
export const POST_SUBMIT_REDIRECT_MS = 2500;
