'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, MapPin, Star, X } from 'lucide-react';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { BuilderPortfolioGrid } from '@/components/shared/BuilderPortfolioGrid';
import { Card, CardContent } from '@/components/ui/card';
import type { DemoLabourProfile } from '@/lib/data/demoPortfolios';

interface DemoLabourPortfolioViewProps {
  profile: DemoLabourProfile;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-px" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => {
        const starIndex = i + 1;
        const filled = rating >= starIndex;
        const half = !filled && rating >= starIndex - 0.5;
        return (
          <Star
            key={starIndex}
            className={`h-3.5 w-3.5 ${
              filled
                ? 'fill-amber-400 text-amber-400'
                : half
                  ? 'fill-amber-400/45 text-amber-400'
                  : 'text-slate-300 dark:text-slate-600'
            }`}
          />
        );
      })}
    </div>
  );
}

export function DemoLabourPortfolioView({ profile }: DemoLabourPortfolioViewProps) {
  const [galleryPhotos, setGalleryPhotos] = useState<string[] | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <FirmLogo
          companyName={profile.companyName}
          logoUrl={profile.logoUrl}
          size="xl"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{profile.companyName}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {profile.location}, Assam
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <StarRating rating={profile.rating} />
            <span className="font-semibold tabular-nums text-foreground">{profile.rating.toFixed(1)}</span>
            <span>·</span>
            <span>{profile.reviewCount} reviews</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {profile.specialty}
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {profile.yearsInBusiness} years in business
            </span>
            <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {profile.projectsCompleted}+ projects
            </span>
            {profile.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Verified Contractor
              </span>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-6 pb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">About</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{profile.about}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-bold text-foreground">Completed Work</h2>
        <div className="space-y-4">
          {profile.portfolio.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <BuilderPortfolioGrid items={[item]} />
                {item.photo_urls.length > 0 && (
                  <div className="border-t border-border px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryPhotos(item.photo_urls);
                        setGalleryTitle(item.title);
                      }}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200"
                    >
                      View all {item.photo_urls.length} photos →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {galleryPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">{galleryTitle}</h3>
              <button
                type="button"
                onClick={() => setGalleryPhotos(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {galleryPhotos.map((url, i) => (
                <div key={url} className="relative aspect-video overflow-hidden rounded-lg bg-secondary">
                  <Image src={url} alt={`${galleryTitle} ${i + 1}`} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
