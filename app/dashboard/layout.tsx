export const dynamic = 'force-dynamic'

import { getAuthUser } from '@/lib/supabase/getUser';
import { TopBar } from './TopBar';
import { ProfileProvider } from '@/lib/context/ProfileProvider';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardFrame } from '@/components/dashboard/DashboardFrame';
import type { Profile, UserRole } from '@/lib/types';
import { normalizeRole } from '@/lib/auth/roles';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

async function getUser() {
  const { supabase, userId, email, role, fullName } = await getAuthUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, role, mobile, physical_address, pincode, avatar_url, is_verified, created_at, updated_at, company_name, logo_url, service_type, gst_number',
    )
    .eq('id', userId)
    .maybeSingle();

  if (profile) return { ...(profile as Profile), role: normalizeRole((profile as Profile).role) };

  return {
    id: userId, email, full_name: fullName || 'User', role,
    mobile: null, physical_address: null, pincode: null,
    avatar_url: null,
    is_verified: false,
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
  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.labour_contractor;
  const avatarGradient = ROLE_AVATAR[role] ?? ROLE_AVATAR.labour_contractor;

  return (
    <ProfileProvider initialProfile={profile as Profile}>
      <DashboardFrame
        sidebar={
          <DashboardSidebar
            role={role}
            roleColor={roleConfig.color}
            avatarGradient={avatarGradient}
            serviceType={profile.service_type}
          />
        }
        topbar={
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
              service_type:     profile.service_type ?? null,
            }}
            roleColor={roleConfig.color}
            avatarGradient={avatarGradient}
          />
        }
      >
        {children}
      </DashboardFrame>
    </ProfileProvider>
  );
}
