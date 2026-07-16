'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { VerifiedBadge } from '@/components/services/VerifiedBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { ServiceProviderPublic } from '@/lib/types/hireServices';
import { cn } from '@/lib/utils';

interface ProviderListCardProps {
  provider: ServiceProviderPublic;
  categorySlug: string;
}

export function ProviderListCard({ provider, categorySlug }: ProviderListCardProps) {
  return (
    <Link
      href={`/hire-services/provider/${provider.id}?from=${categorySlug}`}
      className={cn(
        'block rounded-xl border border-border bg-card/80 p-4 sm:p-5',
        'hover:border-emerald-500/35 hover:shadow-md transition-all',
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <UserAvatar
          name={provider.full_name}
          avatarUrl={provider.avatar_url}
          size="md"
          gradient="from-emerald-500 to-teal-600"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{provider.full_name}</h3>
            {provider.is_verified && <VerifiedBadge compact />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{provider.district}</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-foreground shrink-0">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
          <span className="font-semibold tabular-nums">{provider.rating_avg.toFixed(1)}</span>
          <span className="text-muted-foreground text-xs">({provider.review_count})</span>
        </div>
        </div>
      </div>
      {provider.starting_rate != null && (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">From </span>
          <span className="font-semibold text-foreground">₹{Number(provider.starting_rate).toLocaleString('en-IN')}</span>
        </p>
      )}
      {provider.bio && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{provider.bio}</p>
      )}
    </Link>
  );
}
