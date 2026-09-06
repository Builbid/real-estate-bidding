import type { ReactNode } from 'react';

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {children}
    </div>
  );
}
