'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { NavLink } from '@/components/shared/NavLink';
import { ServiceTypeSelector } from '@/components/owner/ServiceTypeSelector';
import { LabourContractorProjectWizard } from '@/components/owner/LabourContractorProjectWizard';
import { ConstructionFirmProjectWizard } from '@/components/owner/ConstructionFirmProjectWizard';
import { TradeServiceProjectWizard } from '@/components/owner/TradeServiceProjectWizard';
import { DrawingDesignProjectWizard } from '@/components/owner/DrawingDesignProjectWizard';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { isConstructionFirmEnabled } from '@/lib/features';
import { isLegacyCarpenterService, isTradeServiceType } from '@/lib/trades';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn } from '@/lib/utils';
import type { ServiceType } from '@/lib/types';

type Phase = 'service' | 'wizard';

function parseServiceParam(value: string | null): ServiceType | null {
  if (isLegacyCarpenterService(value)) return null;
  if (value === 'labour_contractor') return value;
  if (value === 'construction_firm' && isConstructionFirmEnabled()) return value;
  if (isDrawingDesignServiceType(value)) return value;
  if (value === 'interior_work') return 'false_ceiling_work';
  if (value === 'interior-designer') return 'false_ceiling_work';
  if (isTradeServiceType(value)) return value;
  return null;
}

function BackToHomeLink() {
  return (
    <NavLink href="/dashboard/owner" prefetch className={cn(NAV_BACK_LINK, 'justify-start text-left')}>
      <ArrowLeft className="w-4 h-4" />
      Back to Home
    </NavLink>
  );
}

function NewProjectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLegacyCarpenterService(searchParams.get('service'))) {
      router.replace('/dashboard/owner');
    }
  }, [router, searchParams]);

  const preselected = parseServiceParam(searchParams.get('service'));

  const [phase, setPhase] = useState<Phase>(preselected ? 'wizard' : 'service');
  const [serviceType, setServiceType] = useState<ServiceType | null>(preselected);

  if (phase === 'wizard' && serviceType === 'labour_contractor') {
    return (
      <div className="space-y-4">
        <BackToHomeLink />
        <LabourContractorProjectWizard />
      </div>
    );
  }

  if (phase === 'wizard' && serviceType === 'construction_firm') {
    return (
      <div className="space-y-4">
        <BackToHomeLink />
        <ConstructionFirmProjectWizard />
      </div>
    );
  }

  if (phase === 'wizard' && serviceType === 'drawing_design') {
    return (
      <div className="space-y-4">
        <BackToHomeLink />
        <DrawingDesignProjectWizard />
      </div>
    );
  }

  if (phase === 'wizard' && serviceType && isTradeServiceType(serviceType)) {
    return (
      <div className="space-y-4">
        <BackToHomeLink />
        <TradeServiceProjectWizard trade={serviceType} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ServiceTypeSelector
        value={serviceType}
        onChange={setServiceType}
        onContinue={() => { if (serviceType) setPhase('wizard'); }}
      />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={null}>
      <NewProjectPageContent />
    </Suspense>
  );
}
