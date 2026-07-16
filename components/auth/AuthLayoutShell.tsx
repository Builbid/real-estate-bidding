'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { AuthSimpleHeader } from '@/components/auth/AuthSimpleHeader';

function isMinimalSignupPath(pathname: string) {
  return (
    pathname === '/signup' ||
    pathname.startsWith('/signup/') ||
    pathname === '/register'
  );
}

export function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const minimalSignup = isMinimalSignupPath(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {minimalSignup ? <AuthSimpleHeader /> : <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
      {!minimalSignup && <Footer compact />}
    </div>
  );
}
