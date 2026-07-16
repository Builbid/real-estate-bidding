import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/Navbar';
import { ArrowLeft } from 'lucide-react';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import type { ServiceCategory } from '@/lib/types/hireServices';

export const metadata: Metadata = {
  title: 'Hire Services',
  description: 'Find verified painters, plumbers, electricians, and more on BuilBid.',
};

export default async function HireServicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('service_categories')
    .select('*')
    .order('name');

  const categories = (data ?? []) as ServiceCategory[];

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-20">
        <NavLink href="/" prefetch className={NAV_BACK_LINK + ' mb-6'}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </NavLink>

        <header className="mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Hire Services</h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Browse local service providers by trade. Request a callback — your number is shared only when you ask to connect.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/hire-services/${cat.slug}`}
              className="group rounded-2xl border border-border bg-card/60 p-6 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all"
            >
              <span className="text-3xl block mb-3" aria-hidden>
                {cat.icon ?? '🔧'}
              </span>
              <h2 className="text-lg font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {cat.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">View providers →</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground text-center">
          Are you a skilled tradesperson?{' '}
          <Link href="/signup/provider" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            Join as a service provider
          </Link>
        </p>
      </main>
    </>
  );
}
