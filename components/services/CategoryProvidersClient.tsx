'use client';

import { useMemo, useState } from 'react';
import { ProviderListCard } from '@/components/services/ProviderListCard';
import type { ServiceCategory, ServiceProviderPublic } from '@/lib/types/hireServices';
import { Input } from '@/components/ui/input';

interface CategoryProvidersClientProps {
  category: ServiceCategory;
  providers: ServiceProviderPublic[];
}

export function CategoryProvidersClient({ category, providers }: CategoryProvidersClientProps) {
  const [districtFilter, setDistrictFilter] = useState('');

  const districts = useMemo(() => {
    const set = new Set(providers.map((p) => p.district).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [providers]);

  const filtered = useMemo(() => {
    const q = districtFilter.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.district.toLowerCase().includes(q));
  }, [providers, districtFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Filter by district
          </label>
          <Input
            placeholder="Type district name…"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            list="district-suggestions"
          />
          <datalist id="district-suggestions">
            {districts.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <p className="text-sm text-muted-foreground sm:pb-2">
          {filtered.length} provider{filtered.length === 1 ? '' : 's'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground text-sm">
          No active providers in {category.name} for this filter yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((provider) => (
            <ProviderListCard key={provider.id} provider={provider} categorySlug={category.slug} />
          ))}
        </div>
      )}
    </div>
  );
}
