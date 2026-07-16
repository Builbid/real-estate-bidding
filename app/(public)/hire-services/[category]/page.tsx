import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/Navbar';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { CategoryProvidersClient } from '@/components/services/CategoryProvidersClient';
import type { ServiceCategory, ServiceProviderPublic } from '@/lib/types/hireServices';

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('service_categories').select('name').eq('slug', slug).maybeSingle();
  return {
    title: data?.name ? `Hire ${data.name}` : 'Hire Services',
  };
}

export default async function HireServicesCategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const supabase = await createClient();

  const { data: categoryRow } = await supabase
    .from('service_categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!categoryRow) notFound();

  const category = categoryRow as ServiceCategory;

  const { data: providerRows } = await supabase
    .from('service_providers_public')
    .select('*')
    .contains('categories', [category.id])
    .order('rating_avg', { ascending: false });

  const providers = (providerRows ?? []) as ServiceProviderPublic[];

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-20">
        <NavLink href="/hire-services" prefetch className={NAV_BACK_LINK + ' mb-6'}>
          <ArrowLeft className="w-4 h-4" />
          All services
        </NavLink>

        <header className="mb-8">
          <span className="text-3xl" aria-hidden>{category.icon ?? '🔧'}</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">{category.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare providers in your area. Phone numbers are not shown here — request a callback on their profile.
          </p>
        </header>

        <CategoryProvidersClient category={category} providers={providers} />
      </main>
    </>
  );
}
