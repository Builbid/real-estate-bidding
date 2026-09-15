'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Footer } from '@/components/shared/Footer';
import { AppToaster } from '@/components/shared/AppToaster';
import { isNewProjectPath } from '@/lib/dashboard/paths';

interface DashboardFrameProps {
  topbar: ReactNode;
  children: ReactNode;
}

export function DashboardFrame({ topbar, children }: DashboardFrameProps) {
  const pathname = usePathname();
  const focusLayout = isNewProjectPath(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppToaster />
      {topbar}
      <main className={`flex-1 ${focusLayout ? 'px-4 py-8' : 'px-4 py-6 sm:px-6'}`}>
        <div className={`mx-auto w-full ${focusLayout ? 'max-w-3xl' : 'max-w-7xl'}`}>
          {children}
        </div>
      </main>
      {focusLayout ? null : <Footer compact />}
    </div>
  );
}
