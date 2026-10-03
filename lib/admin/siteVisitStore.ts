import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiteVisitRecord, SoilType } from '@/lib/admin/siteVisit';

export const SITE_VISIT_TABLE_MISSING_MESSAGE =
  'Database tables missing. Run supabase/migrations/058_supervisor_site_visits_commission.sql in the Supabase SQL Editor, then retry.';

export function isMissingWorkflowTable(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST205' ||
    message.includes('project_site_visits') ||
    message.includes('supervisor_commissions') ||
    message.includes('approved_at') ||
    message.includes('agreement_status') ||
    message.includes('does not exist')
  );
}

type SiteVisitRow = {
  project_id: string;
  visit_date: string;
  plot_length_ft: number | string;
  plot_width_ft: number | string;
  plinth_area_sqft: number | string;
  floors: number;
  soil_type: string;
  road_width_ft: number | string;
  water_available: boolean;
  electricity_available: boolean;
  storage_available: boolean;
  site_notes: string | null;
  updated_at: string;
};

export function siteVisitFromRow(row: SiteVisitRow): SiteVisitRecord {
  return {
    projectId: row.project_id,
    visitDate: String(row.visit_date).slice(0, 10),
    plotLengthFt: Number(row.plot_length_ft),
    plotWidthFt: Number(row.plot_width_ft),
    plinthAreaSqft: Number(row.plinth_area_sqft),
    floors: Number(row.floors),
    soilType: row.soil_type as SoilType,
    roadWidthFt: Number(row.road_width_ft),
    waterAvailable: !!row.water_available,
    electricityAvailable: !!row.electricity_available,
    storageAvailable: !!row.storage_available,
    siteNotes: row.site_notes ?? '',
    updatedAt: row.updated_at,
  };
}

/** Returns the saved checklist for a project, or null (also null if the table is not migrated yet). */
export async function loadSiteVisit(
  admin: SupabaseClient,
  projectId: string,
): Promise<SiteVisitRecord | null> {
  const { data, error } = await admin
    .from('project_site_visits')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error || !data) return null;
  return siteVisitFromRow(data as SiteVisitRow);
}

/** Short rows describing the supervisor's measurements, for agreement summaries / emails. */
export function siteVisitSummary(visit: SiteVisitRecord | null): Record<string, string> {
  if (!visit) return {};
  const soil: Record<string, string> = {
    hard: 'Hard / rocky',
    medium: 'Medium',
    soft: 'Soft / clayey',
    filled: 'Filled ground',
  };
  return {
    'Site Visit (Supervisor)': visit.visitDate.split('-').reverse().join('/'),
    'Plot (L x W)': `${visit.plotLengthFt} ft x ${visit.plotWidthFt} ft`,
    'Measured Plinth Area': `${visit.plinthAreaSqft.toLocaleString('en-IN')} sq. ft.`,
    'Floors': String(visit.floors),
    'Soil Condition': soil[visit.soilType] ?? visit.soilType,
    'Access Road Width': `${visit.roadWidthFt} ft`,
  };
}
