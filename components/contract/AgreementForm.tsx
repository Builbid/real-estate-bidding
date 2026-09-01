'use client';

import { useState } from 'react';
import { Download, FileText, Mail, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BUILBID_OFFICIAL_AGREEMENT_EMAILS } from '@/lib/contract/mistriAgreement';

export interface AgreementFormProps {
  projectId: string;
  projectTitle: string;
  clientName: string;
  mistriName: string;
  siteAddress: string;
  acceptedRateLabel: string;
  rateRows: { label: string; value: string }[];
  scopePreview: { label: string; value: string }[];
  paymentMilestoneClause: string;
  agreedStartDate: string;
}

export function AgreementForm({
  projectId,
  projectTitle,
  clientName,
  mistriName,
  siteAddress,
  acceptedRateLabel,
  rateRows,
  scopePreview,
  paymentMilestoneClause,
  agreedStartDate,
}: AgreementFormProps) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/agreements/pdf?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Could not download the agreement PDF.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Official-Signed-Agreement-${projectId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Agreement PDF downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  }

  async function resendOfficialEmail() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/agreements/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(body?.error || 'Could not send the official agreement email.');
      }
      setMessage(`PDF sent to ${BUILBID_OFFICIAL_AGREEMENT_EMAILS.join(', ')}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email dispatch failed.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-emerald-500/25">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-500" />
          Official Mistri / Civil Work Agreement
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">{projectTitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Client
            </dt>
            <dd className="font-medium text-foreground">{clientName}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Head Mason (Mistri)
            </dt>
            <dd className="font-medium text-foreground">{mistriName}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Site address
            </dt>
            <dd className="font-medium text-foreground">{siteAddress}</dd>
          </div>
          {rateRows.length > 0 ? (
            rateRows.map((row) => (
              <div key={row.label}>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="font-semibold text-foreground">{row.value}</dd>
              </div>
            ))
          ) : (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Accepted civil work rates
              </dt>
              <dd className="font-semibold text-foreground">{acceptedRateLabel}</dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Agreed start
            </dt>
            <dd className="font-medium text-foreground">{agreedStartDate}</dd>
          </div>
        </dl>

        <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-xs text-foreground leading-relaxed">
          <p className="font-semibold mb-1">Mandatory BuilBid payment gateway</p>
          All project funds must flow exclusively through BuilBid (Homeowner gateway → Mistri). Cash
          paid directly to the Mistri is prohibited and voids platform guarantees. The accepted rate
          is fixed and non-negotiable after award.
        </div>

        {paymentMilestoneClause && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Payment milestone
            </p>
            <p className="text-xs text-foreground leading-relaxed">{paymentMilestoneClause}</p>
            <p className="text-[11px] text-muted-foreground mt-2">
              10-day grace after the completion date. Unexcused Mistri delay beyond grace: 5%
              deduction from labour payout. Material delays by the homeowner extend the deadline.
            </p>
          </div>
        )}

        {scopePreview.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Scope of work (from project posting)
            </p>
            <ul className="space-y-1.5">
              {scopePreview.slice(0, 8).map((row) => (
                <li key={`${row.label}-${row.value}`} className="text-xs text-foreground">
                  <span className="font-semibold">{row.label}:</span> {row.value}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
          An official copy is emailed to {BUILBID_OFFICIAL_AGREEMENT_EMAILS.join(', ')} when
          the Head Mason is selected. It is not sent to the client or mistri from this dispatch.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={downloadPdf} disabled={downloading}>
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resendOfficialEmail}
            disabled={sending}
          >
            <Mail className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Resend to official email'}
          </Button>
        </div>
        {message && <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}
