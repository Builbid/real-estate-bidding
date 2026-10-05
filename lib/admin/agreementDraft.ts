import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteVisit } from '@/lib/admin/siteVisitStore';
import type { SiteVisitRecord } from '@/lib/admin/siteVisit';
import { findProjectByAnyId } from '@/lib/contract/resolveProjectId';
import type { DigitalContractRecord } from '@/lib/contract/renderDigitalContract';
import { formatBuilbidPublicId } from '@/lib/contract/agreementPdf';
import { agreementFittingLabel, agreementSiteAddress } from '@/lib/admin/fittingLabel';
import { isMistriCivilService } from '@/lib/contract/mistriAgreement';

export interface AgreementDraft {
  project: {
    id: string;
    publicId: string;
    title: string;
    district: string;
    state: string;
    serviceType: string | null;
    isMistriCivil: boolean;
    ownerId: string;
    builderId: string;
    pincode: string;
    siteAddress: string;
  };
  client: { name: string; email: string; mobile: string; address: string; accountId: string };
  contractor: {
    name: string;
    email: string;
    mobile: string;
    gstNumber: string;
    platformId: string;
  };
  visit: SiteVisitRecord | null;
  contract: DigitalContractRecord | null;
  /** Concealed Fitting or Non-Concealed Fitting for electrical and plumbing projects. */
  fittingLabel: string | null;
  commission: { amount: number; status: string; creditedAt: string } | null;
  defaults: {
    plinthAreaSqft: number | null;
    totalCost: number | null;
    /** Accepted (winning) bid amount, shown for comparison with the measured total. */
    bidTotal: number | null;
    /** Supervisor's measured Total Accurate Cost (null until a checklist with measurements is saved). */
    measuredTotal: number | null;
    startDate: string;
    completionDate: string;
  };
}

export function todayIstIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Collects everything the Agreement workspace auto-populates from. */
export async function loadAgreementDraft(
  admin: SupabaseClient,
  projectRef: string,
): Promise<AgreementDraft | { error: string }> {
  const { data: project } = await findProjectByAnyId<{
    id: string;
    numeric_id: string | null;
    title: string;
    district: string;
    state: string;
    pincode: string | null;
    owner_id: string;
    selected_builder_id: string | null;
    service_type: string | null;
    budget_range_max: number | null;
    trade_details: unknown;
  }>(
    admin,
    projectRef,
    'id, numeric_id, title, district, state, pincode, owner_id, selected_builder_id, service_type, budget_range_max, trade_details',
  );
  if (!project) return { error: 'Project not found.' };
  if (!project.selected_builder_id) {
    return { error: 'No Mistri / contractor has been finalized for this project yet.' };
  }

  const [{ data: owner }, { data: builder }, { data: bid }, visit, contractRes, commissionRes] =
    await Promise.all([
      admin.from('profiles').select('full_name, email, mobile, physical_address').eq('id', project.owner_id).maybeSingle(),
      admin
        .from('profiles')
        .select('full_name, email, mobile, company_name, gst_number')
        .eq('id', project.selected_builder_id)
        .maybeSingle(),
      admin
        .from('bids')
        .select('total_sum_metric')
        .eq('project_id', project.id)
        .eq('builder_id', project.selected_builder_id)
        .limit(1)
        .maybeSingle(),
      loadSiteVisit(admin, project.id),
      admin.from('project_digital_contracts').select('*').eq('project_id', project.id).maybeSingle(),
      admin
        .from('supervisor_commissions')
        .select('amount, status, credited_at')
        .eq('project_id', project.id)
        .maybeSingle(),
    ]);

  const contract = (contractRes.data as DigitalContractRecord | null) ?? null;
  const bidTotal = bid?.total_sum_metric != null ? Number(bid.total_sum_metric) : null;
  // Precedence: signed/sent contract -> supervisor's measured Total Accurate Cost -> accepted bid.
  const measuredTotal =
    visit?.totalAccurateCost != null && visit.totalAccurateCost > 0 ? visit.totalAccurateCost : null;
  const totalCost =
    contract != null
      ? Number(contract.total_agreed_cost)
      : measuredTotal ??
        bidTotal ??
        (project.budget_range_max != null ? Number(project.budget_range_max) : null);

  const specAddress = agreementSiteAddress(project.trade_details);
  const ownerAddress = owner?.physical_address?.trim() || '';
  const districtName = project.district?.trim() || '';
  const siteAddress =
    specAddress ||
    (ownerAddress && ownerAddress.toLowerCase() !== districtName.toLowerCase() ? ownerAddress : '');

  const startDate = contract
    ? String(contract.start_date).slice(0, 10)
    : visit?.agreedStartDate || '';
  const completionDate = contract
    ? String(contract.completion_date).slice(0, 10)
    : visit?.targetCompletionDate || '';

  return {
    project: {
      id: project.id,
      publicId: (project.numeric_id ?? '').trim().toUpperCase(),
      title: project.title,
      district: project.district,
      state: project.state,
      pincode: (project.pincode ?? '').trim(),
      siteAddress,
      serviceType: project.service_type,
      isMistriCivil: isMistriCivilService(project.service_type),
      ownerId: project.owner_id,
      builderId: project.selected_builder_id,
    },
    client: {
      name: owner?.full_name?.trim() || 'Homeowner',
      email: owner?.email?.trim() || '',
      mobile: owner?.mobile?.trim() || '',
      address: ownerAddress,
      accountId: formatBuilbidPublicId(project.owner_id),
    },
    contractor: {
      name: builder?.company_name?.trim() || builder?.full_name?.trim() || 'Contractor',
      email: builder?.email?.trim() || '',
      mobile: builder?.mobile?.trim() || '',
      gstNumber: builder?.gst_number?.trim() || '',
      platformId: formatBuilbidPublicId(project.selected_builder_id),
    },
    visit,
    contract,
    fittingLabel: agreementFittingLabel(project.service_type, project.trade_details),
    commission: commissionRes.data
      ? {
          amount: Number(commissionRes.data.amount),
          status: String(commissionRes.data.status),
          creditedAt: String(commissionRes.data.credited_at),
        }
      : null,
    defaults: {
      plinthAreaSqft:
        (visit && visit.plinthAreaSqft > 0 ? visit.plinthAreaSqft : null) ??
        (contract?.plinth_area_sqft != null ? Number(contract.plinth_area_sqft) : null),
      bidTotal,
      measuredTotal,
      totalCost: totalCost != null && Number.isFinite(totalCost) ? totalCost : null,
      startDate,
      completionDate,
    },
  };
}
