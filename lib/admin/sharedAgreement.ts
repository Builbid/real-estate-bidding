import type { MeasuredLineItem } from '@/lib/admin/siteMeasurements';

/** Frozen copy of the agreement the supervisor shares with both the Home Owner and the Mistri / Worker. */
export interface SharedAgreementSnapshot {
  projectTitle: string;
  projectPublicId: string;
  location: string;
  tradeLabel: string;
  ownerName: string;
  workerName: string;
  startDate: string;
  completionDate: string;
  plinthAreaSqft: number | null;
  floors: number | null;
  soilLabel: string | null;
  siteVisitDate: string | null;
  facilities: string[];
  lineItems: MeasuredLineItem[];
  totalCost: number | null;
  signatureStatus: 'draft' | 'pending_esign' | 'partially_signed' | 'signed';
  approved: boolean;
}

export interface SharedAgreementRecord {
  id: string;
  projectId: string;
  sharedAt: string;
  snapshot: SharedAgreementSnapshot;
}

export function sharedAgreementFromRow(row: {
  id: string;
  project_id: string;
  shared_at: string;
  snapshot: unknown;
}): SharedAgreementRecord | null {
  if (!row.snapshot || typeof row.snapshot !== 'object') return null;
  const snapshot = row.snapshot as SharedAgreementSnapshot;
  return {
    id: row.id,
    projectId: row.project_id,
    sharedAt: row.shared_at,
    snapshot: {
      ...snapshot,
      facilities: Array.isArray(snapshot.facilities) ? snapshot.facilities : [],
      lineItems: Array.isArray(snapshot.lineItems) ? snapshot.lineItems : [],
    },
  };
}
