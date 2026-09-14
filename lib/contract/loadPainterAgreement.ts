import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isOfficialAdminEmail } from '@/lib/admin/constants';
import {
  buildPainterAgreementPayload,
  isPainterService,
  type PainterAgreementPayload,
  type PainterAgreementParty,
} from '@/lib/contract/painterAgreement';
import type { BidRates } from '@/lib/types';

export async function loadPainterAgreementPayload(
  projectId: string,
  userId: string,
): Promise<{ payload: PainterAgreementPayload } | { error: string; status: number }> {
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, owner_id, title, district, state, pincode, description, painter_details, sub_configuration, service_type, selected_builder_id, numeric_id',
    )
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { error: 'Project not found.', status: 404 };
  }

  if (!isPainterService(project.service_type)) {
    return { error: 'Agreements of this type apply only to Painter projects.', status: 400 };
  }

  if (!project.selected_builder_id) {
    return { error: 'No Painter has been selected for this project yet.', status: 400 };
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
  const isSelectedPainter = project.selected_builder_id === userId;
  if (!isOwner && !isSelectedPainter && !isAdmin) {
    return { error: 'Not authorized to access this agreement.', status: 403 };
  }

  const { data: winningBid } = await supabase
    .from('bids')
    .select('id, total_sum_metric, single_rate, rates')
    .eq('project_id', projectId)
    .eq('builder_id', project.selected_builder_id)
    .limit(1)
    .single();

  let owner: PainterAgreementParty = { name: 'Client' };
  let painter: PainterAgreementParty = { name: 'Painter' };

  try {
    const admin = createAdminClient();
    const [{ data: ownerRow }, { data: painterRow }] = await Promise.all([
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
    if (painterRow) {
      painter = {
        name: painterRow.full_name ?? 'Painter',
        email: painterRow.email,
        mobile: painterRow.mobile,
        address: painterRow.physical_address,
        companyName: painterRow.company_name,
        gstNumber: painterRow.gst_number,
        yearsInBusiness: painterRow.years_in_business,
        isVerified: painterRow.is_verified,
        platformId: project.selected_builder_id,
      };
    }
  } catch (err) {
    console.warn('Admin profile lookup failed for painter agreement:', err);
  }

  const payload = buildPainterAgreementPayload({
    project: {
      id: project.id,
      numeric_id: project.numeric_id,
      title: project.title,
      district: project.district,
      state: project.state,
      pincode: project.pincode,
      description: project.description,
      painter_details: project.painter_details,
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
    painter,
  });

  return { payload };
}
