import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiteVisitRecord, SoilType } from '@/lib/admin/siteVisit';
import type { MeasuredLineItem, MeasurementTradeKey } from '@/lib/admin/siteMeasurements';

export const SITE_VISIT_TABLE_MISSING_MESSAGE =
  'Database tables missing. Run supabase/migrations/061_site_visit_trade_measurements_and_shared_agreements.sql (self-contained, includes the 058 tables) in the Supabase SQL Editor, then retry.';

export function isMissingWorkflowTable(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    message.includes('project_site_visits') ||
    message.includes('supervisor_commissions') ||
    message.includes('shared_agreements') ||
    message.includes('approved_at') ||
    message.includes('agreement_status') ||
    message.includes('does not exist')
  );
}

type SiteVisitRow = {
  project_id: string;
  visit_date: string;
  plot_length_ft: number | string | null;
  plot_width_ft: number | string | null;
  plinth_area_sqft: number | string | null;
  floors: number;
  soil_type: string;
  road_width_ft: number | string;
  water_available: boolean;
  electricity_available: boolean;
  storage_available: boolean;
  site_notes: string | null;
  trade_key?: string | null;
  measurements?: Record<string, unknown> | null;
  line_items?: unknown;
  total_accurate_cost?: number | string | null;
  updated_at: string;
};

function readMeasurements(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' || typeof value === 'number') out[key] = String(value);
  }
  return out;
}

function readLineItems(raw: unknown): MeasuredLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): MeasuredLineItem[] => {
    if (!entry || typeof entry !== 'object') return [];
    const e = entry as Record<string, unknown>;
    const rate = Number(e.rate);
    const quantity = Number(e.quantity);
    const amount = Number(e.amount);
    if (![rate, quantity, amount].every(Number.isFinite)) return [];
    const multiplier = Number(e.rateMultiplier);
    return [
      {
        id: String(e.id ?? ''),
        group: String(e.group ?? ''),
        label: String(e.label ?? ''),
        unit: String(e.unit ?? ''),
        rate,
        ...(Number.isFinite(multiplier) && multiplier > 1 ? { rateMultiplier: multiplier } : {}),
        quantity,
        amount,
      },
    ];
  });
}

export function siteVisitFromRow(row: SiteVisitRow): SiteVisitRecord {
  const total = row.total_accurate_cost != null ? Number(row.total_accurate_cost) : null;
  return {
    projectId: row.project_id,
    visitDate: String(row.visit_date).slice(0, 10),
    plotLengthFt: Number(row.plot_length_ft ?? 0) || 0,
    plotWidthFt: Number(row.plot_width_ft ?? 0) || 0,
    plinthAreaSqft: Number(row.plinth_area_sqft ?? 0) || 0,
    floors: Number(row.floors),
    soilType: row.soil_type as SoilType,
    roadWidthFt: Number(row.road_width_ft),
    waterAvailable: !!row.water_available,
    electricityAvailable: !!row.electricity_available,
    storageAvailable: !!row.storage_available,
    siteNotes: row.site_notes ?? '',
    tradeKey: (row.trade_key as MeasurementTradeKey | null | undefined) ?? null,
    measurements: readMeasurements(row.measurements),
    lineItems: readLineItems(row.line_items),
    totalAccurateCost: total != null && Number.isFinite(total) ? total : null,
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

function inrText(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
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
  const rows: Record<string, string> = {
    'Site Visit (Supervisor)': visit.visitDate.split('-').reverse().join('/'),
  };
  if (visit.plotLengthFt > 0 && visit.plotWidthFt > 0) {
    rows['Plot (L x W)'] = `${visit.plotLengthFt} ft x ${visit.plotWidthFt} ft`;
  }
  if (visit.plinthAreaSqft > 0) {
    rows['Measured Plinth Area'] = `${visit.plinthAreaSqft.toLocaleString('en-IN')} sq. ft.`;
  }
  rows['Floors'] = String(visit.floors);
  rows['Soil Condition'] = soil[visit.soilType] ?? visit.soilType;
  if (visit.roadWidthFt > 0) rows['Access Road Width'] = `${visit.roadWidthFt} ft`;
  for (const item of visit.lineItems) {
    rows[`${item.group} — ${item.label}`] =
      `${item.quantity.toLocaleString('en-IN')} ${item.unit} × ${inrText(item.rate)}${
        item.rateMultiplier ? ` × ${item.rateMultiplier}` : ''
      } = ${inrText(item.amount)}`;
  }
  if (visit.totalAccurateCost != null) {
    rows['Total Accurate Cost (measured)'] = inrText(visit.totalAccurateCost);
  }
  return rows;
}
