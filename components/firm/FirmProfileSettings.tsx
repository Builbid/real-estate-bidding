'use client';

import { LogoUpload } from '@/components/firm/LogoUpload';
import { uploadFirmLogo } from '@/lib/firm/uploadFirmLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FirmProfileSettingsProps {
  companyName: string;
  gstNumber: string;
  yearsInBusiness: number | null;
  logoUrl: string | null;
  fullName: string;
}

export function FirmProfileSettings({
  companyName,
  gstNumber,
  yearsInBusiness,
  logoUrl,
  fullName,
}: FirmProfileSettingsProps) {
  async function handleLogoUpload(file: File | null) {
    if (file) await uploadFirmLogo(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Company Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <LogoUpload
          companyName={companyName || fullName}
          logoUrl={logoUrl}
          onFileSelected={(file) => { if (file) void handleLogoUpload(file); }}
        />

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 py-2 border-b border-border">
            <dt className="text-muted-foreground">Company Name</dt>
            <dd className="font-semibold text-foreground text-right">{companyName || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2 border-b border-border">
            <dt className="text-muted-foreground">GST Number</dt>
            <dd className="font-mono text-xs font-semibold text-foreground">{gstNumber || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">Years in Business</dt>
            <dd className="font-semibold text-foreground">{yearsInBusiness ?? '—'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
