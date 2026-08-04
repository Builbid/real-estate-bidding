'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { AdminActionBar } from './AdminActionBar';
import { STATUS_CONFIG, TRACK_LABELS, getConstructionLabel } from '@/lib/utils';
import { formatBuildingTypesSummary, hasNewBuildingConfig } from '@/lib/buildingConfig';
import { getProjectServiceType, getServiceBadgeLabel } from '@/lib/project/display';
import { getBidDisplayRate, formatPackageRateRange } from '@/lib/firm/bidDisplay';
import { cn } from '@/lib/utils';
import type { Project, Profile, Bid, ServiceType } from '@/lib/types';

type ServiceFilter = 'all' | ServiceType;

interface AdminServiceTablesProps {
  projects: Project[];
  profiles: Profile[];
  recentBids: Bid[];
}

const FILTER_OPTIONS: { id: ServiceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'labour_contractor', label: 'Labour Contractor' },
  { id: 'construction_firm', label: 'Construction Firm' },
];

export function AdminServiceTables({ projects, profiles, recentBids }: AdminServiceTablesProps) {
  const [projectFilter, setProjectFilter] = useState<ServiceFilter>('all');
  const [bidFilter, setBidFilter] = useState<ServiceFilter>('all');

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const filteredProjects = useMemo(() => {
    if (projectFilter === 'all') return projects;
    return projects.filter((p) => getProjectServiceType(p) === projectFilter);
  }, [projects, projectFilter]);

  const filteredBids = useMemo(() => {
    if (bidFilter === 'all') return recentBids;
    return recentBids.filter((b) => (b.service_type ?? 'labour_contractor') === bidFilter);
  }, [recentBids, bidFilter]);

  function bidderLabel(bid: Bid): string {
    const p = bid.builder_id ? profileMap.get(bid.builder_id) : undefined;
    if (!p) return 'Unknown';
    if (p.role === 'construction_firm') return p.company_name ?? p.full_name;
    return p.full_name;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {FILTER_OPTIONS.map(({ id, label }) => (
          <button
            key={`proj-${id}`}
            type="button"
            onClick={() => setProjectFilter(id)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
              projectFilter === id
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                : 'bg-secondary/50 border-border text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredProjects.map((project) => {
          const serviceType = getProjectServiceType(project);
          return (
            <div key={project.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-secondary/30 hover:border-border transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{project.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant={serviceType === 'construction_firm' ? 'violet' : 'amber'} className="text-[9px]">
                    {getServiceBadgeLabel(serviceType)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{project.district}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {hasNewBuildingConfig(project)
                      ? formatBuildingTypesSummary(project.building_types ?? [])
                      : getConstructionLabel(project.track_type, project.sub_configuration)}
                  </span>
                </div>
              </div>
              <Badge variant={
                project.status === 'active_24h' ? 'emerald' :
                project.status === 'frozen_24h' ? 'indigo' : 'default'
              } className="text-[10px]">
                {STATUS_CONFIG[project.status].label}
              </Badge>
              <AdminActionBar projectId={project.id} projectStatus={project.status} />
            </div>
          );
        })}
        {filteredProjects.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No projects found</p>
        )}
      </div>

      <div className="mt-8">
        <p className="text-sm font-semibold text-foreground mb-2">Recent Bid Activity</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {FILTER_OPTIONS.map(({ id, label }) => (
            <button
              key={`bid-${id}`}
              type="button"
              onClick={() => setBidFilter(id)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
                bidFilter === id
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-secondary/50 border-border text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {filteredBids.slice(0, 10).map((bid) => (
            <div key={bid.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
              <div>
                <p className="text-[10px] text-foreground font-medium truncate">{bidderLabel(bid)}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Project {bid.project_id.slice(-6).toUpperCase()}
                </p>
              </div>
              <p className="text-xs font-bold text-emerald-400">
                {bid.service_type === 'construction_firm'
                  ? formatPackageRateRange(bid.package_rates) ?? '—'
                  : `₹${getBidDisplayRate(bid).toLocaleString('en-IN')}/sqft`}
              </p>
            </div>
          ))}
          {filteredBids.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No bid activity</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground mb-2">Construction Firms</p>
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {profiles.filter((p) => p.role === 'construction_firm').map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
              <div>
                <p className="text-xs font-semibold text-foreground">{p.company_name ?? p.full_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{p.gst_number ?? 'No GST'}</p>
              </div>
              <Link href={`/firm/${p.id}`} className="text-[10px] text-violet-400 hover:underline">
                View Portfolio
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
