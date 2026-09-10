'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ServiceTypeSelector } from '@/components/owner/ServiceTypeSelector';
import { LabourContractorProjectWizard } from '@/components/owner/LabourContractorProjectWizard';
import { ConstructionFirmProjectWizard } from '@/components/owner/ConstructionFirmProjectWizard';
import { TradeServiceProjectWizard } from '@/components/owner/TradeServiceProjectWizard';
import { DrawingDesignProjectWizard } from '@/components/owner/DrawingDesignProjectWizard';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { isConstructionFirmEnabled } from '@/lib/features';
import { isActiveTradeServiceType, isRetiredTradeService } from '@/lib/trades';
import type { ServiceType } from '@/lib/types';

type Phase = 'service' | 'wizard';

function parseServiceParam(value: string | null): ServiceType | null {
  if (isRetiredTradeService(value)) return null;
  if (value === 'interior_work' || value === 'interior-designer') return null;
  if (value === 'labour_contractor') return value;
  if (value === 'construction_firm' && isConstructionFirmEnabled()) return value;
  if (isDrawingDesignServiceType(value)) return value;
  if (isActiveTradeServiceType(value)) return value;
  return null;
}

function NewProjectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const service = searchParams.get('service');
    if (isRetiredTradeService(service) || service === 'interior_work' || service === 'interior-designer') {
      router.replace('/dashboard/owner');
    }
  }, [router, searchParams]);

  const preselected = parseServiceParam(searchParams.get('service'));

  const [phase, setPhase] = useState<Phase>(preselected ? 'wizard' : 'service');
  const [serviceType, setServiceType] = useState<ServiceType | null>(preselected);

  if (phase === 'wizard' && serviceType === 'labour_contractor') {
    return <LabourContractorProjectWizard />;
  }

  if (phase === 'wizard' && serviceType === 'construction_firm') {
    return <ConstructionFirmProjectWizard />;
  }

  if (phase === 'wizard' && serviceType === 'drawing_design') {
    return <DrawingDesignProjectWizard />;
  }

  if (phase === 'wizard' && serviceType && isActiveTradeServiceType(serviceType)) {
    return <TradeServiceProjectWizard trade={serviceType} />;
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
