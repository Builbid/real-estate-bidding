import { createClient } from '@/lib/supabase/server';
import { HomePageContent } from '@/components/home/HomePageContent';
import { loadHomePublicData } from '@/lib/home/loadHomePublicData';
import { normalizeRole } from '@/lib/auth/roles';

async function getAuthStatus() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { isAuthenticated: false, role: null };

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const [{ data: sp }, { data: profile }] = await Promise.all([
      supabase.from('service_providers').select('id').eq('id', user.id).maybeSingle(),
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    ]);

    let role: ReturnType<typeof normalizeRole>;
    if (sp) {
      role = 'service_provider';
    } else {
      role = normalizeRole(profile?.role);
      if (
        !profile &&
        (meta.role === 'service_provider' ||
          meta.hire_service_provider === true ||
          meta.hire_service_provider === 'true')
      ) {
        role = 'service_provider';
      }
    }
    return { isAuthenticated: true, role };
  } catch {
    return { isAuthenticated: false, role: null };
  }
}

export default async function HomePage() {
  const [publicData, auth] = await Promise.all([loadHomePublicData(), getAuthStatus()]);

  return (
    <HomePageContent
      showcaseProjects={publicData.showcaseProjects}
      frozenProjects={publicData.frozenProjects}
      statValues={publicData.statValues}
      isAuthenticated={auth.isAuthenticated}
      role={auth.role}
      featuredFirms={publicData.featuredFirms}
    />
  );
}
