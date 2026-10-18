'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Footer } from '@/components/shared/Footer';
import { AppToaster } from '@/components/shared/AppToaster';
import { isNewProjectPath, OWNER_DASHBOARD_PATH } from '@/lib/dashboard/paths';

interface DashboardFrameProps {
  topbar: ReactNode;
  children: ReactNode;
}

export function DashboardFrame({ topbar, children }: DashboardFrameProps) {
  const pathname = usePathname();
  const focusLayout = isNewProjectPath(pathname);
  const compactOwnerLayout =
    pathname === OWNER_DASHBOARD_PATH || pathname === '/dashboard/owner/projects/selected';
  const contentWidth = focusLayout ? 'max-w-3xl' : compactOwnerLayout ? 'max-w-4xl' : 'max-w-5xl';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppToaster />
      {topbar}
      <main className={`flex-1 px-4 sm:px-6 ${focusLayout ? 'py-8' : 'py-6'}`}>
        <div className={`mx-auto w-full ${contentWidth}`}>
          {children}
        </div>
      </main>
      {focusLayout ? null : <Footer compact />}
    </div>
  );
}
