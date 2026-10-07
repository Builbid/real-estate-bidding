import { createClient } from '@/lib/supabase/server';
import { isWorkerAccountRole } from '@/lib/auth/roles';
import { categoryLabel, resolveWorkerCategory } from '@/lib/workers/types';
import type { BuilderPortfolioItem } from '@/lib/types';

export interface PublicWorkerProfile {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  yearsOfExperience: number | null;
  isVerified: boolean;
  portfolio: BuilderPortfolioItem[];
}

type PublicRow = {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  service_type?: string | null;
  years_in_business?: number | null;
};

export async function getPublicWorkerProfile(id: string): Promise<PublicWorkerProfile | null> {
  const supabase = await createClient();

  let result = await supabase
    .from('profiles_public')
    .select('id, full_name, role, avatar_url, is_verified, service_type, years_in_business')
    .eq('id', id)
    .maybeSingle();

  if (result.error) {
    result = await supabase
      .from('profiles_public')
      .select('id, full_name, role, avatar_url, is_verified, service_type')
      .eq('id', id)
      .maybeSingle();
  }

  const row = result.data as PublicRow | null;
  if (result.error || !row || !isWorkerAccountRole(row.role)) return null;

  const { data: items } = await supabase
    .from('builder_portfolio_items')
    .select('*')
    .eq('builder_id', id)
    .order('sort_order', { ascending: true });

  const years = row.years_in_business;
  return {
    id: row.id,
    name: row.full_name,
    specialty: categoryLabel(resolveWorkerCategory(row.service_type, row.role)),
    avatarUrl:
      row.avatar_url ??
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.full_name)}`,
    yearsOfExperience: typeof years === 'number' && years > 0 ? Math.floor(years) : null,
    isVerified: row.is_verified ?? false,
    portfolio: (items ?? []) as BuilderPortfolioItem[],
  };
}
