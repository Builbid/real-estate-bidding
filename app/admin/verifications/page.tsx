import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AdminVerificationsClient } from '@/components/admin/AdminVerificationsClient';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import type { ServiceProvider } from '@/lib/types/hireServices';

export default async function AdminVerificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/verifications');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const { data: rows } = await supabase
    .from('service_providers')
    .select('*')
    .not('verification_submitted_at', 'is', null)
    .eq('is_verified', false)
    .order('verification_submitted_at', { ascending: true });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="hover:opacity-90">
          <BuilBidLogo size="sm" />
        </Link>
        <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:text-foreground">
          Admin home
        </Link>
      </header>
      <main className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Provider verifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Approve or reject optional badge requests.</p>
        </div>
        <AdminVerificationsClient pending={(rows ?? []) as ServiceProvider[]} />
      </main>
    </div>
  );
}
