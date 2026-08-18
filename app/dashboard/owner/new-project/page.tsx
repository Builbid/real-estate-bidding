'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceTypeSelector } from '@/components/owner/ServiceTypeSelector';
import { LabourContractorProjectWizard } from '@/components/owner/LabourContractorProjectWizard';
import { ConstructionFirmProjectWizard } from '@/components/owner/ConstructionFirmProjectWizard';
import { TradeServiceProjectWizard } from '@/components/owner/TradeServiceProjectWizard';
import { DrawingDesignProjectWizard } from '@/components/owner/DrawingDesignProjectWizard';
import { isDrawingDesignServiceType } from '@/lib/drawingDesign';
import { isConstructionFirmEnabled } from '@/lib/features';
import { isLegacyCarpenterService, isTradeServiceType } from '@/lib/trades';
import type { ServiceType } from '@/lib/types';

type Phase = 'service' | 'wizard';

function parseServiceParam(value: string | null): ServiceType | null {
  if (isLegacyCarpenterService(value)) return null;
  if (value === 'labour_contractor') return value;
  if (value === 'construction_firm' && isConstructionFirmEnabled()) return value;
  if (isDrawingDesignServiceType(value)) return value;
  if (value === 'interior_work') return 'false_ceiling_work';
  if (isTradeServiceType(value)) return value;
  return null;
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
        <Button variant="ghost" size="sm" className="max-w-2xl mx-auto flex" onClick={() => { setPhase('service'); setServiceType(null); }}>
          <ArrowLeft className="w-4 h-4" /> Change service type
        </Button>
        <LabourContractorProjectWizard />
      </div>
    );
  }

  if (phase === 'wizard' && serviceType === 'construction_firm') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="max-w-2xl mx-auto flex" onClick={() => { setPhase('service'); setServiceType(null); }}>
          <ArrowLeft className="w-4 h-4" /> Change service type
        </Button>
        <ConstructionFirmProjectWizard />
      </div>
    );
  }

  if (phase === 'wizard' && serviceType === 'drawing_design') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="max-w-2xl mx-auto flex" onClick={() => { setPhase('service'); setServiceType(null); }}>
          <ArrowLeft className="w-4 h-4" /> Change service type
        </Button>
        <DrawingDesignProjectWizard />
      </div>
    );
  }

  if (phase === 'wizard' && serviceType && isTradeServiceType(serviceType)) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="max-w-2xl mx-auto flex" onClick={() => { setPhase('service'); setServiceType(null); }}>
          <ArrowLeft className="w-4 h-4" /> Change service type
        </Button>
        <TradeServiceProjectWizard trade={serviceType} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Post New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your service type to get started
        </p>
      </div>
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
