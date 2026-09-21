'use client';

import { useState, useTransition } from 'react';
import { FileSignature, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IndianContractDateField } from '@/components/admin/IndianContractDateField';
import { sendContractAgreementForSignatureAction } from '@/app/admin/contract-actions';
import { formatAadhaarInput } from '@/lib/contract/aadhaar';

export function CreateContractAgreementModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  clientName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [plinthArea, setPlinthArea] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [clientAadhaar, setClientAadhaar] = useState('');
  const [contractorAadhaar, setContractorAadhaar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    setPlinthArea('');
    setStartDate('');
    setCompletionDate('');
    setTotalCost('');
    setClientAadhaar('');
    setContractorAadhaar('');
    setError(null);
    setMessage(null);
  }

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendContractAgreementForSignatureAction({
        projectId,
        plinthArea,
        startDate,
        completionDate,
        totalCost,
        clientAadhaar,
        contractorAadhaar,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? 'Contract sent for dual Aadhaar eSign.');
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-emerald-600" />
            Create Contract Agreement
          </DialogTitle>
          <DialogDescription>
            {projectTitle} · Client: {clientName}. Existing bid-winning agreement clauses are
            preserved. Both parties will receive a draft PDF and Aadhaar eSign OTP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            label="Approximate Plinth Area (Sq. Ft.)"
            accentLabel={false}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 1200"
            value={plinthArea}
            onChange={(e) => setPlinthArea(e.target.value)}
          />
          <IndianContractDateField
            label="• Choose Start Date (DD/MM/YYYY):"
            value={startDate}
            onChange={setStartDate}
          />
          <IndianContractDateField
            label="• Target Project Completion Date (DD/MM/YYYY):"
            value={completionDate}
            onChange={setCompletionDate}
            minIso={startDate || undefined}
          />
          <Input
            label="Total Agreed Project Cost (₹)"
            accentLabel={false}
            type="text"
            inputMode="decimal"
            prefix="₹"
            placeholder="e.g. 450000"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
          />
          <Input
            label="Client / Homeowner Aadhaar Number"
            accentLabel={false}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="XXXX XXXX XXXX"
            value={clientAadhaar}
            onChange={(e) => setClientAadhaar(formatAadhaarInput(e.target.value))}
          />
          <Input
            label="Contractor / Mistri Aadhaar Number"
            accentLabel={false}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="XXXX XXXX XXXX"
            value={contractorAadhaar}
            onChange={(e) => setContractorAadhaar(formatAadhaarInput(e.target.value))}
          />

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          {message ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p> : null}

          <Button type="button" className="w-full" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
            {pending ? 'Sending…' : 'Send Contract Agreement for Signature'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
