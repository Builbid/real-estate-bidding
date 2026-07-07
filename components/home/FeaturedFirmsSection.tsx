'use client';

import { FeaturedPartnersCarousel } from '@/components/home/FeaturedPartnersCarousel';
import {
  DEMO_CONSTRUCTION_FIRMS,
  DEMO_LABOUR_CONTRACTORS,
} from '@/lib/data/demoFirms';
import { useTranslation } from '@/lib/context/LanguageProvider';

export function FeaturedFirmsSection() {
  const { t } = useTranslation();

  return (
    <section className="border-b border-border bg-background py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <FeaturedPartnersCarousel
          title={t('home.featuredFirms.labourTitle')}
          subtitle={t('home.featuredFirms.labourSubtitle')}
          firms={DEMO_LABOUR_CONTRACTORS}
          partnerType="labour_contractor"
        />

        <FeaturedPartnersCarousel
          title={t('home.featuredFirms.firmsTitle')}
          subtitle={t('home.featuredFirms.firmsSubtitle')}
          firms={DEMO_CONSTRUCTION_FIRMS}
          partnerType="construction_firm"
          className="mt-6 sm:mt-7"
        />
      </div>
    </section>
  );
}
