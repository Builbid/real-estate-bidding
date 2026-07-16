import { createClient } from '@/lib/supabase/server';
import { ProviderSignupForm } from '@/components/services/ProviderSignupForm';
import type { ServiceCategory } from '@/lib/types/hireServices';

export default async function ProviderSignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('service_categories').select('*').order('name');
  const categories = (data ?? []) as ServiceCategory[];

  return (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center p-4 py-10">
      <ProviderSignupForm categories={categories} />
    </div>
  );
}
