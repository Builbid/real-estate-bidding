'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, MapPin, X } from 'lucide-react';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { Card, CardContent } from '@/components/ui/card';
import { formatYearsExperience } from '@/lib/workers/experience';
import type { BuilderPortfolioItem } from '@/lib/types';

export interface WorkerExperienceProfileProps {
  name: string;
  locationLabel?: string | null;
  specialty: string;
  avatarUrl: string;
  yearsOfExperience: number | null;
  isVerified?: boolean;
  about?: string | null;
  portfolio: BuilderPortfolioItem[];
}

export function WorkerExperienceProfile({
  name,
  locationLabel,
  specialty,
  avatarUrl,
  yearsOfExperience,
  isVerified,
  about,
  portfolio,
}: WorkerExperienceProfileProps) {
  const [galleryPhotos, setGalleryPhotos] = useState<string[] | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');
  const experienceLabel = formatYearsExperience(yearsOfExperience);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <FirmLogo companyName={name} logoUrl={avatarUrl} size="xl" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{name}</h1>
          {locationLabel && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {locationLabel}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {experienceLabel && (
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {experienceLabel}
              </span>
            )}
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {specialty}
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {about && (
        <Card>
          <CardContent className="space-y-2 pt-6 pb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">About</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{about}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-1 text-lg font-bold text-foreground">Completed Projects Portfolio</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Past completed works with site photos, location, and a short description.
        </p>
        {portfolio.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              This worker has not added completed projects yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {portfolio.map((item) => {
              const cover = item.photo_urls[0];
              return (
                <Card key={item.id} className="overflow-hidden">
                  <div className="relative aspect-[16/10] bg-secondary">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={item.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <CardContent className="space-y-2 pt-4 pb-4">
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    {item.location && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {item.location}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                    )}
                    {item.photo_urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryPhotos(item.photo_urls);
                          setGalleryTitle(item.title);
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200"
                      >
                        View all {item.photo_urls.length} photos
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
