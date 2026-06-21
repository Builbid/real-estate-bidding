'use client';

import Link from 'next/link';
import { MapPin, Layers, Clock, Users, ArrowRight, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountdownTicker } from './CountdownTicker';
import { Button } from '@/components/ui/button';
import { STATUS_CONFIG, TRACK_LABELS, cn } from '@/lib/utils';
import { RCC_CONFIG_LABELS, ASSAM_CONFIG_LABELS } from '@/lib/types';
import type { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
  bidCount?: number;
  lowestRate?: number;
  showLeaderboard?: boolean;
  isAuthenticated?: boolean;
}

export function ProjectCard({
  project,
  bidCount = 0,
  lowestRate,
  showLeaderboard = false,
  isAuthenticated = false,
}: ProjectCardProps) {
  const status = STATUS_CONFIG[project.status];
  const isActive = project.status === 'active_24h';
  const isFrozen = project.status === 'frozen_24h';

  const configLabel =
    project.track_type === 'RCC'
      ? project.sub_configuration.rcc_config
        ? RCC_CONFIG_LABELS[project.sub_configuration.rcc_config]
        : '—'
      : project.sub_configuration.assam_config
      ? ASSAM_CONFIG_LABELS[project.sub_configuration.assam_config]
      : '—';

  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all duration-300',
      'hover:border-slate-600 hover:shadow-2xl hover:shadow-slate-900/50',
      isActive && 'border-emerald-500/20 hover:border-emerald-500/40',
      isFrozen && 'border-indigo-500/20 hover:border-indigo-500/30',
    )}>
      {/* Status strip */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5',
        isActive && 'bg-gradient-to-r from-emerald-500 to-teal-500',
        isFrozen && 'bg-gradient-to-r from-indigo-500 to-blue-500',
        !isActive && !isFrozen && 'bg-slate-800'
      )} />

      <CardContent className="pt-5 pb-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={isActive ? 'emerald' : isFrozen ? 'indigo' : 'default'}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {status.label}
              </Badge>
              <Badge variant="default" className="text-slate-500">
                {TRACK_LABELS[project.track_type]}
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {project.title}
            </h3>
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Building className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">District</p>
              <p className="text-xs font-medium text-slate-300">{project.district}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Configuration</p>
              <p className="text-xs font-medium text-slate-300 leading-snug">{configLabel}</p>
            </div>
          </div>
          {project.plot_area_sqft && (
            <div className="flex items-start gap-2">
              <div className="w-3.5 h-3.5 rounded border border-slate-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Plot Area</p>
                <p className="text-xs font-medium text-slate-300">{project.plot_area_sqft.toLocaleString()} sqft</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Users className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Total Bids</p>
              <p className="text-xs font-semibold text-white">{bidCount}</p>
            </div>
          </div>
        </div>

        {/* Lowest rate — only shown to authenticated users during frozen/completed */}
        {lowestRate !== undefined && isAuthenticated && !isActive && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-0.5">Lowest Bid Rate</p>
            <p className="text-lg font-bold text-white">₹{lowestRate.toLocaleString('en-IN')}<span className="text-sm font-normal text-slate-400">/sqft</span></p>
          </div>
        )}

        {/* Countdown */}
        {isActive && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1.5">Bidding Closes In</p>
            <CountdownTicker targetDateISO={project.bidding_ends_at} compact />
          </div>
        )}

        {isFrozen && project.selection_ends_at && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1.5">Selection Window</p>
            <CountdownTicker targetDateISO={project.selection_ends_at} compact />
          </div>
        )}

        {/* CTA */}
        <Button variant="outline" size="sm" className="w-full group/btn" asChild>
          <Link href={`/project/${project.id}`}>
            <span>View Project</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
