'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2, CheckCircle2, ExternalLink, FileText, ImageIcon, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FirmLogo } from '@/components/firm/FirmLogo';
import { FirmConstructionClassPackagesDisplay } from '@/components/firm/FirmConstructionClassPackagesDisplay';
import { SelectFirmButton } from '@/components/firm/SelectFirmButton';
import { isFirmBrochurePdfUrl } from '@/lib/firm/constants';
import type { PublicFirmProfile, FirmPortfolioItem } from '@/lib/types';

interface FirmPublicProfileViewProps {
  firm: PublicFirmProfile;
  portfolio: FirmPortfolioItem[];
  showSelect?: boolean;
  projectId?: string;
  aboutText?: string;
  rating?: number;
  reviewCount?: number;
  specialty?: string;
}

export function FirmPublicProfileView({
  firm,
  portfolio,
  showSelect = false,
  projectId,
  aboutText,
  rating,
  reviewCount,
  specialty,
}: FirmPublicProfileViewProps) {
  const [galleryPhotos, setGalleryPhotos] = useState<string[] | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [brochureOpen, setBrochureOpen] = useState(false);

  const city = firm.physical_address?.split(',')[0]?.trim() ?? 'Assam';
  const brochureUrl = firm.brochure_url ?? null;
  const brochureIsPdf = isFirmBrochurePdfUrl(brochureUrl);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <FirmLogo companyName={firm.company_name} logoUrl={firm.logo_url} size="xl" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{firm.company_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{city}{firm.pincode ? `, ${firm.pincode}` : ''}</p>
          {(rating != null || reviewCount != null) && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold tabular-nums text-foreground">{rating?.toFixed(1)}</span>
              {reviewCount != null && <span>· {reviewCount} reviews</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {specialty && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                {specialty}
              </span>
            )}
            {firm.years_in_business != null && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                {firm.years_in_business} years in business
              </span>
            )}
            {firm.gst_verified && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> GST Verified ✓
              </span>
            )}
            {firm.is_verified && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 font-semibold inline-flex items-center gap-1">
                <Star className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {brochureUrl && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (brochureIsPdf) {
                    window.open(brochureUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    setBrochureOpen(true);
                  }
                }}
              >
                {brochureIsPdf ? (
                  <FileText className="w-3.5 h-3.5" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                View Brochure
                {brochureIsPdf && <ExternalLink className="w-3 h-3 opacity-70" />}
              </Button>
            )}
            {showSelect && projectId && (
              <SelectFirmButton projectId={projectId} firmId={firm.id} companyName={firm.company_name} />
            )}
          </div>
        </div>
      </div>

      {firm.construction_class_packages && firm.construction_class_packages.length > 0 && (
        <Card>
          <CardContent className="pt-6 pb-6">
            <FirmConstructionClassPackagesDisplay packages={firm.construction_class_packages} />
          </CardContent>
        </Card>
      )}

      {brochureUrl && (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                  {brochureIsPdf ? (
                    <FileText className="h-5 w-5 text-violet-400" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-violet-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Company Brochure
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Packages, scope, and company details from the firm.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (brochureIsPdf) {
                    window.open(brochureUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    setBrochureOpen(true);
                  }
                }}
              >
                View Brochure
                {brochureIsPdf && <ExternalLink className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 pb-6 space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">About</h2>
          {aboutText && (
            <p className="text-sm text-muted-foreground leading-relaxed">{aboutText}</p>
          )}
          {firm.gst_masked && (
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">GST Number:</span> {firm.gst_masked}
            </p>
          )}
          {firm.years_in_business != null && (
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">Years in Business:</span> {firm.years_in_business} years
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Location:</span> {city}
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Our Past Projects</h2>
        {portfolio.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center text-sm text-muted-foreground">
              This firm hasn&apos;t added portfolio projects yet
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolio.map((item) => {
              const thumb = item.photos?.[0];
              return (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-secondary/50 flex items-center justify-center relative">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={item.project_name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-10 h-10 text-muted-foreground/40" />
                    )}
                  </div>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm font-bold text-foreground">{item.project_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.location} · {item.year_completed}
                    </p>
                    {item.photos && item.photos.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full text-xs"
                        onClick={() => {
                          setGalleryPhotos(item.photos ?? []);
                          setGalleryTitle(item.project_name);
                        }}
                      >
                        View Photos
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {galleryPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">{galleryTitle}</h3>
              <button type="button" onClick={() => setGalleryPhotos(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {galleryPhotos.map((url, i) => (
                <div key={url} className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
                  <Image src={url} alt={`${galleryTitle} ${i + 1}`} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {brochureOpen && brochureUrl && !brochureIsPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Company Brochure</h3>
              <button
                type="button"
                onClick={() => setBrochureOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full min-h-[50vh] rounded-lg overflow-hidden bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brochureUrl}
                alt={`${firm.company_name} brochure`}
                className="w-full h-auto object-contain"
              />
            </div>
            <a
              href={brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-400 hover:underline"
            >
              Open full size <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
