import type { Project, PublicProfile } from './types';
import { getDashboardPath, normalizeRole } from './auth/roles';

export interface ShowcaseProject extends Project {
  owner?: Pick<PublicProfile, 'id' | 'full_name'>;
  bid_count: number;
  lowest_rate: number | null;
  isDemo?: boolean;
}

export type ShowcaseCardAction = 'viewDetails' | 'bidNow';

function isDemoProjectId(projectId: string): boolean {
  return projectId.startsWith('demo-');
}

export function getShowcaseCardAction(
  projectId: string,
  role: string | null,
  options?: { isDemo?: boolean },
): { href: string; action: ShowcaseCardAction } {
  const isDemo = options?.isDemo ?? isDemoProjectId(projectId);

  if (isDemo) {
    if (!role) {
      return { href: '/signup', action: 'viewDetails' };
    }
    const normalized = normalizeRole(role);
    if (normalized === 'labour_contractor') {
      return { href: '/dashboard/builder', action: 'bidNow' };
    }
    if (normalized === 'construction_firm') {
      return { href: '/dashboard/firm', action: 'bidNow' };
    }
    return { href: getDashboardPath(normalized), action: 'viewDetails' };
  }

  const normalized = normalizeRole(role);
  if (normalized === 'labour_contractor') {
    return { href: `/dashboard/builder/bid/${projectId}`, action: 'bidNow' };
  }
  if (normalized === 'construction_firm') {
    return { href: `/dashboard/firm/bid/${projectId}`, action: 'bidNow' };
  }
  return { href: `/project/${projectId}`, action: 'viewDetails' };
}

export function getShowcaseSectionLink(
  isAuthenticated: boolean,
  role: string | null,
): { href: string; labelKey: 'home.auctions.signUpToBid' | 'home.auctions.bidNow' | 'home.auctions.viewDashboard' } {
  if (!isAuthenticated) {
    return { href: '/register', labelKey: 'home.auctions.signUpToBid' };
  }
  if (normalizeRole(role) === 'labour_contractor') {
    return { href: '/dashboard/builder', labelKey: 'home.auctions.bidNow' };
  }
  if (normalizeRole(role) === 'construction_firm') {
    return { href: '/dashboard/firm', labelKey: 'home.auctions.bidNow' };
  }
  return { href: getDashboardPath(normalizeRole(role)), labelKey: 'home.auctions.viewDashboard' };
}

export function formatShowcaseRemaining(targetDateISO: string): {
  label: string;
  isExpired: boolean;
  isUrgent: boolean;
} {
  const diff = Math.max(0, new Date(targetDateISO).getTime() - Date.now());

  if (diff === 0) {
    return { label: '', isExpired: true, isUrgent: false };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  if (days === 0) parts.push(`${seconds}s`);

  return {
    label: `${parts.join(' ')} remaining`,
    isExpired: false,
    isUrgent: days === 0 && hours === 0 && minutes < 30,
  };
}

export function isProjectBiddingLive(project: Pick<Project, 'status' | 'bidding_ends_at'>): boolean {
  return project.status === 'active_24h' && new Date(project.bidding_ends_at) > new Date();
}

export function sortShowcaseProjectsByLatest(projects: ShowcaseProject[]): ShowcaseProject[] {
  return [...projects].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
