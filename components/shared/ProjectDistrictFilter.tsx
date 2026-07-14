'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { searchDistrictOptions } from '@/lib/project/districtFilter';
import { useTranslation } from '@/lib/context/LanguageProvider';
import { cn } from '@/lib/utils';

export type DistrictFilterValue = 'all' | string;

interface ProjectDistrictFilterProps {
  value: DistrictFilterValue;
  onChange: (value: DistrictFilterValue) => void;
  districts: readonly string[];
  heroOverlay?: boolean;
}

export function ProjectDistrictFilter({
  value,
  onChange,
  districts,
  heroOverlay = false,
}: ProjectDistrictFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Avoid iOS auto-zoom from autofocus on small search fields
    if (window.matchMedia('(min-width: 768px)').matches) {
      searchRef.current?.focus();
    }
  }, [open]);

  const filteredOptions = useMemo(
    () => searchDistrictOptions(query, districts),
    [districts, query],
  );

  const isActive = value !== 'all';

  function selectDistrict(next: DistrictFilterValue) {
    onChange(next);
    setQuery('');
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm',
            isActive
              ? heroOverlay
                ? 'bg-sky-400/20 border-sky-300/40 text-sky-100 shadow-sky-500/10'
                : 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300 shadow-sky-500/10'
              : heroOverlay
                ? 'bg-white/5 border-white/15 text-white/70 hover:text-white hover:border-white/25'
                : 'bg-secondary/50 border-border/70 text-muted-foreground hover:text-foreground hover:border-border',
          )}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-[9rem] truncate">
            {isActive ? value : t('home.auctions.filterDistrict')}
          </span>
          {isActive && (
            <span
              role="button"
              tabIndex={0}
              aria-label={t('home.auctions.clearDistrict')}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onChange('all');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange('all');
                }
              }}
            >
              <X className="h-3 w-3" aria-hidden />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('home.auctions.searchDistrict')}
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-sky-500/50"
            />
          </div>
        </div>

        <div className="max-h-52 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => selectDistrict('all')}
            className={cn(
              'flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs transition-colors',
              value === 'all'
                ? 'bg-sky-500/10 font-semibold text-sky-700 dark:text-sky-300'
                : 'text-foreground hover:bg-secondary/60',
            )}
          >
            {t('home.auctions.allDistricts')}
          </button>

          {filteredOptions.length > 0 ? (
            filteredOptions.map((district) => (
              <button
                key={district}
                type="button"
                onClick={() => selectDistrict(district)}
                className={cn(
                  'flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                  value === district
                    ? 'bg-sky-500/10 font-semibold text-sky-700 dark:text-sky-300'
                    : 'text-foreground hover:bg-secondary/60',
                )}
              >
                {district}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">
              {t('home.auctions.noDistrictMatch')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
