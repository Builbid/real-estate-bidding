'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  IdCard,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Printer,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { adminSignOutAction } from '@/app/admin/actions';
import {
  updateSupervisorContactAction,
  type SupervisorProfileDetails,
} from '@/app/admin/supervisor-actions';
import type { SupervisorAccount } from '@/lib/admin/data';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Button } from '@/components/ui/button';

const CARD =
  'rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const AADHAAR_PLACEHOLDER = 'XXXX XXXX XXXX';

function formatMoney(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function maskAadhaar(value: string): string {
  if (value.length < 4) return AADHAAR_PLACEHOLDER;
  return `XXXX XXXX ${value.slice(-4)}`;
}

function formatAadhaar(value: string): string {
  return value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatSlipDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatSlipTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  valueClassName = 'text-2xl',
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div className={CARD}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        {label}
      </p>
      <p className={`mt-2 font-bold leading-snug text-slate-900 dark:text-white ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
  action,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
          {children}
        </dd>
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </div>
  );
}

function ContactEditor({
  icon,
  label,
  value,
  field,
  inputType,
  onSaved,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  field: 'phone' | 'email';
  inputType: 'tel' | 'email';
  onSaved: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await updateSupervisorContactAction({ field, value: draft });
    setSaving(false);
    if (result.error || !result.value) {
      setError(result.error || 'Could not save that change.');
      return;
    }
    onSaved(result.value);
    setDraft(result.value);
    setEditing(false);
  }

  return (
    <DetailRow
      icon={icon}
      label={label}
      action={
        editing ? null : (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            Edit
          </button>
        )
      }
    >
      {editing ? (
        <span className="mt-1 flex flex-col gap-2">
          <input
            type={inputType}
            inputMode={field === 'phone' ? 'numeric' : 'email'}
            autoComplete={field === 'phone' ? 'tel' : 'email'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none ring-emerald-600 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            aria-label={label}
          />
          <span className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
          </span>
          {error ? <span className="text-xs font-normal text-rose-600">{error}</span> : null}
        </span>
      ) : (
        value || '—'
      )}
    </DetailRow>
  );
}

function SupervisorIdCard({
  name,
  supervisorId,
  phone,
  email,
  photoUrl,
  onClose,
}: {
  name: string;
  supervisorId: string;
  phone: string;
  email: string;
  photoUrl: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function printCard() {
    document.body.classList.add('printing-supervisor-id');
    const finish = () => {
      document.body.classList.remove('printing-supervisor-id');
      window.removeEventListener('afterprint', finish);
    };
    window.addEventListener('afterprint', finish);
    window.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervisor-id-card-title"
        className="w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={printCard}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Print ID Card
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ID card"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <article
          id="supervisor-id-card"
          className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-2xl"
        >
          <header>
            <div className="bg-white px-5 py-4">
              <BuilBidLogo size="sm" />
            </div>
            <p
              id="supervisor-id-card-title"
              className="bg-[#0a0a0a] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e8c547]"
            >
              Official Supervisor Identity Card
            </p>
          </header>

          <div className="flex gap-4 px-5 py-5">
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {photoUrl ? (
                // Registration photo is a private signed URL, not a next/image remote pattern.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={`${name} profile photo`} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-slate-400">
                  <UserRound className="h-10 w-10" aria-hidden />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Field Supervisor</p>
              <h3 className="mt-0.5 text-lg font-bold leading-tight text-slate-900">{name}</h3>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Supervisor Admin ID
              </p>
              <p className="font-mono text-sm font-semibold tracking-wide text-slate-900">{supervisorId || '—'}</p>
            </div>
          </div>

          <dl className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Phone number</dt>
              <dd className="font-medium text-slate-900">{phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Email address</dt>
              <dd className="break-all font-medium text-slate-900">{email || '—'}</dd>
            </div>
          </dl>

          <footer className="flex items-center justify-between bg-slate-50 px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <span>BuilBid</span>
            <span>Authorised field staff</span>
          </footer>
        </article>
      </div>
    </div>
  );
}

/**
 * Full-page "Profile & Accounts": financial summary, personal details and the Payment Slips
 * menu. Replaces the old pop-up; opened by tapping the supervisor's avatar / name.
 */
export function SupervisorAccountsView({
  account,
  details,
  error,
}: {
  account: SupervisorAccount;
  details: SupervisorProfileDetails | null;
  error: string | null;
}) {
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [slipsOpen, setSlipsOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [phone, setPhone] = useState(details?.phone || '');
  const [email, setEmail] = useState(details?.email || '');
  const slips = details?.slips ?? [];
  // Issued slips mark the matching commissions paid, so this figure is already net of those amounts.
  const pendingBalance = Math.max(0, account.pendingBalance);

  return (
    <div className="min-h-screen">
      <style>{`
        @media print {
          body.printing-supervisor-id * { visibility: hidden !important; }
          body.printing-supervisor-id #supervisor-id-card,
          body.printing-supervisor-id #supervisor-id-card * { visibility: visible !important; }
          body.printing-supervisor-id #supervisor-id-card {
            position: fixed;
            left: 12mm;
            top: 12mm;
            width: 92mm;
            box-shadow: none !important;
          }
        }
      `}</style>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <Link
          href="/admin/dashboard?tab=projects"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <form action={adminSignOutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <UserRound className="h-10 w-10 shrink-0 text-slate-800 dark:text-slate-100" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">
              {account.name}
            </h1>
            <p className="text-sm text-slate-500">Supervisor Profile &amp; Accounts</p>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <section aria-label="Financial summary" className="grid gap-4 md:grid-cols-2">
          <SummaryCard
            icon={Wallet}
            label="Unpaid / Pending Balance"
            value={formatMoney(pendingBalance)}
            hint={`${account.commissionRate} commission · reduced automatically when a payment slip is issued`}
          />
          <SummaryCard
            icon={CalendarClock}
            label="Payment Cycle"
            value="10-Day Settlement Cycle"
            valueClassName="text-xl"
            hint={account.nextPaymentCycle}
          />
        </section>

        <section className={CARD} aria-label="Personal details">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Personal details</h2>
          <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            <ContactEditor
              icon={Phone}
              label="Phone number"
              value={phone}
              field="phone"
              inputType="tel"
              onSaved={setPhone}
            />
            <DetailRow icon={IdCard} label="Supervisor Admin ID">
              <span className="font-mono tracking-wide">{details?.supervisorId || '—'}</span>
            </DetailRow>
            <DetailRow icon={IdCard} label="Aadhaar details">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono tracking-wide">
                  {details?.aadhaarNumber
                    ? showAadhaar
                      ? formatAadhaar(details.aadhaarNumber)
                      : maskAadhaar(details.aadhaarNumber)
                    : AADHAAR_PLACEHOLDER}
                </span>
                {details?.aadhaarNumber ? (
                  <button
                    type="button"
                    onClick={() => setShowAadhaar((v) => !v)}
                    aria-label={showAadhaar ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="text-xs font-normal text-slate-400">Not provided yet</span>
                )}
              </span>
            </DetailRow>
            <ContactEditor
              icon={Mail}
              label="Email"
              value={email}
              field="email"
              inputType="email"
              onSaved={setEmail}
            />
          </dl>
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIdCardOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <IdCard className="h-4 w-4" aria-hidden />
              View / Print ID Card
            </button>
          </div>
        </section>

        <section className={CARD} aria-label="Payment slips">
          <button
            type="button"
            onClick={() => setSlipsOpen((open) => !open)}
            aria-expanded={slipsOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex min-w-0 items-center gap-2">
              <FolderOpen className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              <span className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                Payment Slips
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {slips.length}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${slipsOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Open to see every receipt. Each issued slip deducts its amount from the unpaid balance.
          </p>

          {slipsOpen ? (
            slips.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                <FileText className="h-8 w-8 text-slate-300" aria-hidden />
                <p className="text-sm text-slate-500">
                  No payment slips yet. A slip appears here after each 10-day settlement.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {slips.map((slip) => (
                  <li key={slip.id} className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{slip.slipNumber}</p>
                    <p className="text-xs text-slate-500">{slip.periodLabel}</p>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Amount Paid
                        </dt>
                        <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatMoney(slip.amount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatSlipDate(slip.paidAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Time</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatSlipTime(slip.paidAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Payment Slip
                        </dt>
                        <dd>
                          <a
                            href={`/admin/payment-slip?id=${slip.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                            PDF / Receipt
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </section>
      </main>

      {idCardOpen ? (
        <SupervisorIdCard
          name={details?.name || account.name}
          supervisorId={details?.supervisorId || ''}
          phone={phone}
          email={email}
          photoUrl={details?.photoUrl ?? null}
          onClose={() => setIdCardOpen(false)}
        />
      ) : null}
    </div>
  );
}
