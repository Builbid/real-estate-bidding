'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { AuthSimpleHeader } from '@/components/auth/AuthSimpleHeader';

function isMinimalAuthPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/') ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  );
}

export function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const minimal = isMinimalAuthPath(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {minimal ? <AuthSimpleHeader hideSignIn={pathname === '/login'} /> : <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
      {!minimal && <Footer compact />}
    </div>
  );
}
