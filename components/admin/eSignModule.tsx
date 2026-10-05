'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { verifyPrototypeEsignAction } from '@/app/admin/contract-actions';
import { formatAadhaarInput } from '@/lib/contract/aadhaar';

type Party = 'client' | 'contractor';

export function ESignModule({
  projectId,
  clientName,
  contractorName,
  partyBTitle,
  clientSigned,
  contractorSigned,
  approved,
}: {
  projectId: string;
  clientName: string;
  contractorName: string;
  partyBTitle: string;
  clientSigned: boolean;
  contractorSigned: boolean;
  approved: boolean;
}) {
  const router = useRouter();
  const [clientAadhaar, setClientAadhaar] = useState('');
  const [contractorAadhaar, setContractorAadhaar] = useState('');
  const [clientOtp, setClientOtp] = useState('');
  const [contractorOtp, setContractorOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<Party | null>(null);
  const [, startVerifying] = useTransition();

  const parties: Array<{
    party: Party;
    title: string;
    name: string;
    aadhaar: string;
    setAadhaar: (value: string) => void;
    otp: string;
    setOtp: (value: string) => void;
    signed: boolean;
  }> = [
    {
      party: 'client',
      title: 'Party A — Homeowner',
      name: clientName,
      aadhaar: clientAadhaar,
      setAadhaar: setClientAadhaar,
      otp: clientOtp,
      setOtp: setClientOtp,
      signed: clientSigned,
    },
    {
      party: 'contractor',
      title: `Party B — ${partyBTitle}`,
      name: contractorName,
      aadhaar: contractorAadhaar,
      setAadhaar: setContractorAadhaar,
      otp: contractorOtp,
      setOtp: setContractorOtp,
      signed: contractorSigned,
    },
  ];

  function verify(party: Party) {
    const row = parties.find((item) => item.party === party);
    if (!row) return;
    setError(null);
    setMessage(null);
    setVerifying(party);
    startVerifying(async () => {
      const result = await verifyPrototypeEsignAction({
        projectId,
        party,
        aadhaar: row.aadhaar,
        otp: row.otp,
      });
      setVerifying(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (party === 'client') setClientOtp('');
      else setContractorOtp('');
      setMessage(result.message ?? 'Verified.');
      router.refresh();
    });
  }

  if (approved) {
    return (
      <p className="inline-flex items-center gap-1.5 border border-emerald-700 bg-emerald-950 px-3 py-2 text-sm font-semibold text-emerald-200">
        <BadgeCheck className="h-4 w-4" />
        Approved / Active. Both Aadhaar OTPs are verified.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {parties.map((row) => {
          const aadhaarReady = row.aadhaar.replace(/\D/g, '').length === 12;
          const otpReady = row.otp.length === 6;
          return (
            <div key={row.party} className="border border-slate-600 bg-slate-900 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-teal-300">{row.title}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-100">{row.name}</p>
              {row.signed ? (
                <p className="mt-3 border border-emerald-600 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                  Verified
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Aadhaar number
                    </span>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="1234 5678 9012"
                      value={row.aadhaar}
                      onChange={(e) => row.setAadhaar(formatAadhaarInput(e.target.value))}
                      className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 font-mono text-sm tracking-wide text-slate-100 outline-none focus:border-teal-400"
                    />
                  </label>
                  <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">OTP</span>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={row.otp}
                        onChange={(e) => row.setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 font-mono text-sm text-slate-100 outline-none focus:border-teal-400"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={verifying !== null || !aadhaarReady || !otpReady}
                      onClick={() => verify(row.party)}
                      className="h-9 bg-teal-700 px-3 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
                    >
                      {verifying === row.party ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error ? <p className="text-xs font-medium text-red-300">{error}</p> : null}
      {message ? <p className="text-xs font-medium text-emerald-300">{message}</p> : null}
    </div>
  );
}
