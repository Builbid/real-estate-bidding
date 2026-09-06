import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import {
  buildMistriAgreementPayload,
  isMistriCivilService,
  type MistriAgreementPayload,
  type MistriAgreementParty,
} from '@/lib/contract/mistriAgreement';
import type { BidRates, SubConfiguration, TrackType } from '@/lib/types';
import type { ConstructionTypesMap } from '@/lib/buildingConfig';

export async function loadMistriAgreementPayload(
  projectId: string,
  userId: string,
): Promise<{ payload: MistriAgreementPayload } | { error: string; status: number }> {
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, owner_id, title, district, state, pincode, description, track_type, sub_configuration, building_types, construction_types, total_floors, plot_area_sqft, floor_area_sqft, mistri_details, service_type, selected_builder_id',
    )
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { error: 'Project not found.', status: 404 };
  }

  if (!isMistriCivilService(project.service_type)) {
    return { error: 'Agreements of this type apply only to Mistri / civil work projects.', status: 400 };
  }

  if (!project.selected_builder_id) {
    return { error: 'No Head Mason has been selected for this project yet.', status: 400 };
  }

  let isAdmin = false;
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
  if (!isOwner && !isSelectedMistri && !isAdmin) {
    return { error: 'Not authorized to access this agreement.', status: 403 };
  }

  const { data: winningBid } = await supabase
    .from('bids')
    .select('id, total_sum_metric, single_rate, rates')
    .eq('project_id', projectId)
    .eq('builder_id', project.selected_builder_id)
    .limit(1)
    .single();

  let owner: MistriAgreementParty = { name: 'Client' };
  let mistri: MistriAgreementParty = { name: 'Head Mason' };

  try {
    const admin = createAdminClient();
    const [{ data: ownerRow }, { data: mistriRow }] = await Promise.all([
      admin
        .from('profiles')
        .select('full_name, email, mobile, physical_address')
        .eq('id', project.owner_id)
        .single(),
      admin
        .from('profiles')
        .select(
          'full_name, email, mobile, physical_address, company_name, gst_number, years_in_business, is_verified',
        )
        .eq('id', project.selected_builder_id)
        .single(),
    ]);

    if (ownerRow) {
      owner = {
        name: ownerRow.full_name ?? 'Client',
        email: ownerRow.email,
        mobile: ownerRow.mobile,
        address: ownerRow.physical_address,
      };
    }
    if (mistriRow) {
      mistri = {
        name: mistriRow.full_name ?? 'Head Mason',
        email: mistriRow.email,
        mobile: mistriRow.mobile,
        address: mistriRow.physical_address,
        companyName: mistriRow.company_name,
        gstNumber: mistriRow.gst_number,
        yearsInBusiness: mistriRow.years_in_business,
        isVerified: mistriRow.is_verified,
        platformId: project.selected_builder_id,
      };
    }
  } catch (err) {
    console.warn('Admin profile lookup failed for mistri agreement:', err);
  }

  const payload = buildMistriAgreementPayload({
    project: {
      id: project.id,
      title: project.title,
      district: project.district,
      state: project.state,
      pincode: project.pincode,
      description: project.description,
      track_type: project.track_type as TrackType,
      sub_configuration: (project.sub_configuration ?? {}) as SubConfiguration,
      building_types: project.building_types,
      construction_types: (project.construction_types ?? null) as ConstructionTypesMap | null,
      total_floors: project.total_floors,
      plot_area_sqft: project.plot_area_sqft,
      floor_area_sqft: project.floor_area_sqft,
      mistri_details: project.mistri_details,
      service_type: project.service_type,
    },
    bid: winningBid
      ? {
          id: winningBid.id,
          single_rate: winningBid.single_rate,
          total_sum_metric: winningBid.total_sum_metric,
          rates: winningBid.rates as BidRates | null,
        }
      : null,
    owner,
    mistri,
  });

  return { payload };
}
