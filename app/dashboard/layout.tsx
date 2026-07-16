export const dynamic = 'force-dynamic'

import { getAuthUser } from '@/lib/supabase/getUser';
import { redirect } from 'next/navigation';
import { TopBar } from './TopBar';
import { Footer } from '@/components/shared/Footer';
import { ProfileProvider } from '@/lib/context/ProfileProvider';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import type { Profile, UserRole } from '@/lib/types';
import { normalizeRole } from '@/lib/auth/roles';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

async function getUser() {
  const { supabase, userId, email, role, fullName } = await getAuthUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profile) return profile;

  const { data: sp } = await supabase
    .from('service_providers')
    .select('full_name, phone, categories, is_verified')
    .eq('id', userId)
    .maybeSingle();

  if (sp) {
    let roleDisplay: string | null = null;
    const categoryIds = sp.categories ?? [];
    if (categoryIds.length > 0) {
      const { data: cat } = await supabase
        .from('service_categories')
        .select('name')
        .eq('id', categoryIds[0])
        .maybeSingle();
      if (cat?.name) roleDisplay = cat.name;
    }
    return {
      id: userId,
      email,
      full_name: sp.full_name,
      role: 'service_provider' as const,
      role_display: roleDisplay,
      mobile: sp.phone,
      physical_address: null,
      pincode: null,
      avatar_url: null,
      is_verified: sp.is_verified ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    id: userId, email, full_name: fullName || 'User', role,
    mobile: null, physical_address: null, pincode: null,
    avatar_url: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

const ROLE_CONFIG: Record<UserRole, { color: 'amber' | 'teal' | 'indigo' | 'violet' | 'emerald' }> = {
  owner:              { color: 'amber'  },
  labour_contractor:  { color: 'teal'   },
  construction_firm:  { color: 'violet' },
  admin:              { color: 'indigo' },
  service_provider:   { color: 'emerald' },
};

const ROLE_AVATAR: Record<UserRole, string> = {
  owner:              'from-amber-400 to-orange-500',
  labour_contractor:  'from-blue-400 to-cyan-500',
  construction_firm:  'from-violet-400 to-indigo-600',
  admin:              'from-violet-400 to-indigo-600',
  service_provider:   'from-emerald-400 to-teal-500',
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const profile = await getUser();
  const role = normalizeRole(profile.role);
  if (role === 'service_provider') {
    redirect('/provider/dashboard');
  }
  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.labour_contractor;
  const avatarGradient = ROLE_AVATAR[role] ?? ROLE_AVATAR.labour_contractor;

  return (
    <ProfileProvider initialProfile={profile as Profile}>
      <div className="min-h-screen flex bg-background">
        <DashboardSidebar
          role={role}
          roleColor={roleConfig.color}
          avatarGradient={avatarGradient}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            profile={{
              id:               profile.id,
              full_name:        profile.full_name,
              email:            profile.email,
              role:             profile.role,
              mobile:           profile.mobile,
              physical_address: profile.physical_address,
              pincode:          profile.pincode,
              avatar_url:       profile.avatar_url ?? null,
              company_name:     profile.company_name ?? null,
              logo_url:         profile.logo_url ?? null,
            }}
            roleColor={roleConfig.color}
            avatarGradient={avatarGradient}
          />

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
          <Footer compact />
        </div>
      </div>
    </ProfileProvider>
  );
}
