export function isNewProjectPath(pathname: string): boolean {
  return (
    pathname === '/dashboard/owner/new-project' ||
    pathname.startsWith('/dashboard/owner/new-project/')
  );
}
