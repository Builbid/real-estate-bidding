import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/Navbar';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { ProviderProfileClient } from '@/components/services/ProviderProfileClient';
import type { ServiceProviderPublic } from '@/lib/types/hireServices';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('service_providers_public')
    .select('full_name')
    .eq('id', id)
    .maybeSingle();
  return { title: data?.full_name ?? 'Service Provider' };
}

export default async function ProviderPublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('service_providers_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!row) notFound();

  const provider = row as ServiceProviderPublic;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginNext = `/hire-services/provider/${id}`;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-20">
        <NavLink href="/hire-services" prefetch className={NAV_BACK_LINK + ' mb-6'}>
          <ArrowLeft className="w-4 h-4" />
          Hire Services
        </NavLink>

        <ProviderProfileClient
          provider={provider}
          isLoggedIn={Boolean(user)}
          loginNext={loginNext}
        />
      </main>
    </>
  );
}
