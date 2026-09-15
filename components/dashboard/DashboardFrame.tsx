'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Footer } from '@/components/shared/Footer';
import { AppToaster } from '@/components/shared/AppToaster';
import { isNewProjectPath } from '@/lib/dashboard/paths';

interface DashboardFrameProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}

export function DashboardFrame({ sidebar, topbar, children }: DashboardFrameProps) {
  const pathname = usePathname();
  const focusLayout = isNewProjectPath(pathname);

  return (
    <div className="flex min-h-screen bg-background">
      <AppToaster />
      {focusLayout ? null : sidebar}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {topbar}
        <main className={focusLayout ? 'flex-1 px-4 py-8' : 'p-4 sm:p-6 lg:p-8'}>
          {focusLayout ? (
            <div className="mx-auto w-full max-w-3xl">{children}</div>
          ) : (
            children
          )}
        </main>
        {focusLayout ? null : <Footer compact />}
      </div>
    </div>
  );
}
