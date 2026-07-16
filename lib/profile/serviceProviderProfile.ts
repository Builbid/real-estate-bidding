import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

export type ServiceProviderProfileRow = {
  full_name: string;
  phone: string;
  categories: string[];
  is_verified: boolean;
  avatar_url?: string | null;
};

export async function fetchServiceProviderRoleDisplay(
  supabase: SupabaseClient,
  categoryIds: string[],
): Promise<string | null> {
  if (!categoryIds.length) return null;
  const { data: cat } = await supabase
    .from('service_categories')
    .select('name')
    .eq('id', categoryIds[0])
    .maybeSingle();
  return cat?.name ?? null;
}

/** Hire Services row wins over a legacy `profiles` row (e.g. trigger default labour_contractor). */
export function mergeServiceProviderProfile(
  base: Profile,
  sp: ServiceProviderProfileRow,
  roleDisplay: string | null,
): Profile {
  return {
    ...base,
    full_name: sp.full_name || base.full_name,
    mobile: sp.phone ?? base.mobile,
    avatar_url: sp.avatar_url ?? base.avatar_url ?? null,
    role: 'service_provider',
    role_display: roleDisplay,
    is_verified: sp.is_verified ?? base.is_verified,
  };
}

export const SERVICE_PROVIDER_PROFILE_SELECT =
  'full_name, phone, categories, is_verified, avatar_url' as const;
