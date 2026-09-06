import type { LucideIcon } from 'lucide-react';
import {
  Brush,
  Building2,
  DraftingCompass,
  HardHat,
  Layers,
  PaintBucket,
  Shovel,
  Wrench,
  Zap,
} from 'lucide-react';
import { getProviderSpecialtyLabel } from '@/lib/trades';
import type { ServiceType } from '@/lib/types';

export type AdminTradeTone =
  | 'emerald'
  | 'purple'
  | 'amber'
  | 'sky'
  | 'indigo'
  | 'teal'
  | 'slate';

export interface AdminTradeBadge {
  key: string;
  label: string;
  tone: AdminTradeTone;
  Icon: LucideIcon;
}

const TONE_CLASS: Record<AdminTradeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function tradeToneClass(tone: AdminTradeTone): string {
  return TONE_CLASS[tone];
}

/** Human label + badge styling for a project `service_type`. */
export function resolveAdminTradeBadge(
  serviceType: string | null | undefined,
): AdminTradeBadge {
  const key = (serviceType ?? '').trim().toLowerCase();

  switch (key) {
    case 'labour_contractor':
    case 'carpenter':
      return {
        key: 'mistri',
        label: 'Mistri / Civil',
        tone: 'emerald',
        Icon: HardHat,
      };
    case 'construction_firm':
      return {
        key: 'firm',
        label: 'Construction Firm',
        tone: 'emerald',
        Icon: Building2,
      };
    case 'painter':
      return {
        key: 'painting',
        label: 'Painting',
        tone: 'purple',
        Icon: PaintBucket,
      };
    case 'electrician':
      return {
        key: 'electrical',
        label: 'Electrical',
        tone: 'amber',
        Icon: Zap,
      };
    case 'plumber':
      return {
        key: 'plumbing',
        label: 'Plumbing',
        tone: 'sky',
        Icon: Wrench,
      };
    case 'drawing_design':
      return {
        key: 'drawing',
        label: 'Drawing / Architecture',
        tone: 'indigo',
        Icon: DraftingCompass,
      };
    case 'false_ceiling_work':
      return {
        key: 'interior',
        label: 'Interior Work',
        tone: 'teal',
        Icon: Layers,
      };
    case 'earthwork':
      return {
        key: 'earthwork',
        label: 'Earthwork',
        tone: 'slate',
        Icon: Shovel,
      };
    default:
      return {
        key: key || 'other',
        label: key
          ? getProviderSpecialtyLabel(key as ServiceType) ||
            key
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
          : 'Unspecified',
        tone: 'slate',
        Icon: Brush,
      };
  }
}

export const ADMIN_TRADE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Trades' },
  { value: 'mistri', label: 'Mistri / Civil' },
  { value: 'firm', label: 'Construction Firm' },
  { value: 'painting', label: 'Painting' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'drawing', label: 'Drawing / Architecture' },
  { value: 'interior', label: 'Interior Work' },
  { value: 'earthwork', label: 'Earthwork' },
];

export const ADMIN_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'live', label: 'Live' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function matchesAdminStatusFilter(
  status: string,
  filter: string,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'live') return status === 'active_24h';
  if (filter === 'frozen') return status === 'frozen_24h';
  if (filter === 'completed') return status === 'completed';
  if (filter === 'cancelled') return status === 'cancelled';
  return true;
}
