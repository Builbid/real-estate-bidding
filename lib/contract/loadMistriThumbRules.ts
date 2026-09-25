import { createClient } from '@/lib/supabase/server';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import { isMistriCivilService } from '@/lib/contract/mistriAgreement';
import type { MistriThumbRulesProjectInput } from '@/lib/thumb-rules/mistriThumbRules';
import type { TrackType } from '@/lib/types';

export async function loadMistriThumbRulesProject(
  projectId: string,
  userId: string,
): Promise<{ project: MistriThumbRulesProjectInput } | { error: string; status: number }> {
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, owner_id, title, district, state, pincode, track_type, total_floors, plot_area_sqft, floor_area_sqft, mistri_details, service_type, selected_builder_id, numeric_id',
    )
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { error: 'Project not found.', status: 404 };
  }

  if (!isMistriCivilService(project.service_type)) {
    return { error: 'Site thumb rules are available for Mistri / civil work projects only.', status: 400 };
  }

  let isAdmin = false;
  let role: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && isOfficialAdminEmail(user.email)) {
      isAdmin = true;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin, email')
        .eq('id', userId)
        .maybeSingle();
      role = profile?.role ?? null;
      isAdmin =
        profile?.role === 'admin' ||
        profile?.is_admin === true ||
        isOfficialAdminEmail(profile?.email);
    }
  } catch {
    isAdmin = false;
  }

  const isOwner = project.owner_id === userId;
  const isSelectedMistri = project.selected_builder_id === userId;
  const isMistriBidder = role === 'labour_contractor';
  if (!isOwner && !isSelectedMistri && !isMistriBidder && !isAdmin) {
    return { error: 'Not authorized to download thumb rules for this project.', status: 403 };
  }

  return {
    project: {
      id: project.id,
      numeric_id: project.numeric_id,
      title: project.title,
      district: project.district,
      state: project.state,
      pincode: project.pincode,
      track_type: project.track_type as TrackType,
      total_floors: project.total_floors,
      plot_area_sqft: project.plot_area_sqft,
      floor_area_sqft: project.floor_area_sqft,
      mistri_details: project.mistri_details,
    },
  };
}
