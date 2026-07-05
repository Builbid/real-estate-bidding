'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceTypeSelector } from '@/components/owner/ServiceTypeSelector';
import { LabourContractorProjectWizard } from '@/components/owner/LabourContractorProjectWizard';
import { ConstructionFirmProjectWizard } from '@/components/owner/ConstructionFirmProjectWizard';
import type { ServiceType } from '@/lib/types';

type Phase = 'service' | 'wizard';

export default function NewProjectPage() {
  const [phase, setPhase] = useState<Phase>('service');
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
