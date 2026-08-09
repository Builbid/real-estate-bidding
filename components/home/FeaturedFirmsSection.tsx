'use client';

import { FeaturedPartnersCarousel } from '@/components/home/FeaturedPartnersCarousel';
import type { DemoFirm } from '@/lib/data/demoFirms';
import { isConstructionFirmEnabled } from '@/lib/features';
import { useTranslation } from '@/lib/context/LanguageProvider';

interface FeaturedFirmsSectionProps {
  labourFirms: DemoFirm[];
  constructionFirms: DemoFirm[];
}

export function FeaturedFirmsSection({ labourFirms, constructionFirms }: FeaturedFirmsSectionProps) {
  const { t } = useTranslation();
  const showConstructionFirms = isConstructionFirmEnabled();

  return (
    <section className="border-t border-border/80 bg-gradient-to-b from-background to-secondary/20 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <FeaturedPartnersCarousel
          title={t('home.featuredFirms.labourTitle')}
          subtitle={t('home.featuredFirms.labourSubtitle')}
          firms={labourFirms}
          partnerType="labour_contractor"
        />

        {showConstructionFirms && (
          <FeaturedPartnersCarousel
            title={t('home.featuredFirms.firmsTitle')}
            subtitle={t('home.featuredFirms.firmsSubtitle')}
            firms={constructionFirms}
            partnerType="construction_firm"
            className="mt-6 sm:mt-7"
          />
        )}
      </div>
    </section>
  );
}
