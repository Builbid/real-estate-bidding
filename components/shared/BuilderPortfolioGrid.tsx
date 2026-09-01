'use client';

import { ImageIcon } from 'lucide-react';
import type { BuilderPortfolioItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BuilderPortfolioGridProps {
  items: BuilderPortfolioItem[];
  className?: string;
}

/** Grid display of builder portfolio work items with photos. */
export function BuilderPortfolioGrid({ items, className }: BuilderPortfolioGridProps) {
  if (items.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground px-1', className)}>
        No portfolio items uploaded yet.
      </p>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-border bg-secondary/30 overflow-hidden"
        >
          {item.photo_urls.length > 0 ? (
            <div className="grid grid-cols-2 gap-0.5 bg-card">
              {item.photo_urls.slice(0, 4).map((url, i) => (
                <div key={i} className="aspect-[4/3] relative bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${item.title} photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {i === 3 && item.photo_urls.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">+{item.photo_urls.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-[16/9] bg-secondary/60 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="p-3">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
