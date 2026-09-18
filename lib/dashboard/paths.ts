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
