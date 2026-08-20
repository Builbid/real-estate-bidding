// ============================================================
// Auto-generated project titles for owner new-project wizards
// and live auction card display.
// Format: "[Service] Work in [District]" — no sub-options or floors.
// ============================================================

import { getProjectServiceType } from '@/lib/project/display';
import type { ServiceType } from '@/lib/types';

export interface GenerateProjectTitleInput {
  serviceType: ServiceType;
  district: string;
}

const TITLE_WORK_PHRASE: Record<ServiceType, string> = {
  plumber: 'Plumbing Work',
  electrician: 'Electrical Work',
  painter: 'Painting Work',
  carpenter: 'Carpentry Work',
  false_ceiling_work: 'Interior Work',
  earthwork: 'Earthwork',
  drawing_design: 'Drawing and Design Work',
  labour_contractor: 'Civil Construction Work',
  construction_firm: 'Civil Construction Work',
};

export function getProjectTitleWorkPhrase(serviceType: ServiceType): string {
  return TITLE_WORK_PHRASE[serviceType] ?? 'Construction Work';
}

/**
 * Build auction title: service work type + district only.
 * Scope, sub-options, floors, and package details stay in the summary table.
 */
export function generateProjectTitle(input: GenerateProjectTitleInput): string {
  const district = input.district.trim() || 'Assam';
  return `${getProjectTitleWorkPhrase(input.serviceType)} in ${district}`;
}

/**
 * Live auction / public card title — always the short service + district form
 * so older posts with concatenated sub-options still display cleanly.
 */
export function getLiveAuctionDisplayTitle(project: {
  title?: string | null;
  district?: string | null;
  service_type?: ServiceType | null;
}): string {
  return generateProjectTitle({
    serviceType: getProjectServiceType(project),
    district: (project.district ?? '').trim() || 'Assam',
  });
}
