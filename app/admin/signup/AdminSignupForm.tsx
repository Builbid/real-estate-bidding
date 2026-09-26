'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeAadhaarNumber, validateAadhaarNumber } from '@/lib/validation/aadhaar';
import {
  completeSupervisorSignupAction,
  sendSupervisorSignupOtpAction,
} from '@/app/admin/signup-actions';

const FIELD_LABEL =
  'block text-left text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400';

const SELECT_CLASS =
  'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm md:text-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:border-sky-400 dark:focus:ring-sky-400/20';

const FILE_CLASS =
  'block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:file:bg-slate-700 dark:file:text-slate-100';

type Step = 'details' | 'otp';

export function AdminSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }
    const aadhaarError = validateAadhaarNumber(aadhaarNumber);
    if (aadhaarError) {
      setError(aadhaarError);
      return;
    }
    if (!aadhaarFront) {
      setError('Aadhaar front side image is required.');
      return;
    }
    if (!aadhaarBack) {
      setError('Aadhaar back side image is required.');
      return;
    }

    setPending(true);
    const result = await sendSupervisorSignupOtpAction({
      fullName,
      email,
      phone,
      role,
      password,
      aadhaarNumber,
    });
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setInfo(`OTP emailed to ${email.trim().toLowerCase()}. Enter the 6-digit code to finish registration.`);
    setStep('otp');
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!aadhaarFront || !aadhaarBack) {
      setError('Upload both Aadhaar images before verifying the OTP.');
      setStep('details');
      return;
    }

    const formData = new FormData();
    formData.set('fullName', fullName);
    formData.set('email', email);
    formData.set('phone', phone);
    formData.set('role', role);
    formData.set('password', password);
    formData.set('confirmPassword', confirmPassword);
    formData.set('aadhaarNumber', aadhaarNumber);
    formData.set('otp', otp);
    formData.set('aadhaarFront', aadhaarFront);
    formData.set('aadhaarBack', aadhaarBack);

    setPending(true);
    const result = await completeSupervisorSignupAction(formData);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.push('/admin/login?registered=1');
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="mb-6 flex flex-col items-center text-center">
        <BuilBidLogo size="md" />
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Admin / Supervisor Registration
        </h1>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {info ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      {step === 'details' ? (
        <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-2">
          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-name" className={FIELD_LABEL}>
              Full Name
            </label>
            <Input
              id="admin-signup-name"
              name="fullName"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              compact
              required
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-email" className={FIELD_LABEL}>
              Email Address
            </label>
            <Input
              id="admin-signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              compact
              required
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-phone" className={FIELD_LABEL}>
              Phone Number
            </label>
            <Input
              id="admin-signup-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              compact
              required
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-role" className={FIELD_LABEL}>
              Role / Position
            </label>
            <select
              id="admin-signup-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={SELECT_CLASS}
              required
            >
              <option value="" disabled>
                Select role / position
              </option>
              <option value="field_supervisor">Field Supervisor</option>
              <option value="admin_staff">Admin Staff</option>
            </select>
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-aadhaar" className={FIELD_LABEL}>
              Aadhaar Number
            </label>
            <Input
              id="admin-signup-aadhaar"
              name="aadhaarNumber"
              inputMode="numeric"
              autoComplete="off"
              placeholder="12-digit Aadhaar number"
              maxLength={12}
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(normalizeAadhaarNumber(e.target.value))}
              compact
              required
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-aadhaar-front" className={FIELD_LABEL}>
              Aadhaar Front Side Image
            </label>
            <input
              id="admin-signup-aadhaar-front"
              name="aadhaarFront"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={FILE_CLASS}
              onChange={(e) => setAadhaarFront(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-aadhaar-back" className={FIELD_LABEL}>
              Aadhaar Back Side Image
            </label>
            <input
              id="admin-signup-aadhaar-back"
              name="aadhaarBack"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={FILE_CLASS}
              onChange={(e) => setAadhaarBack(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-password" className={FIELD_LABEL}>
              Password
            </label>
            <Input
              id="admin-signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              compact
              required
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-confirm" className={FIELD_LABEL}>
              Confirm Password
            </label>
            <Input
              id="admin-signup-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              compact
              required
            />
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={pending}>
            {pending ? 'Sending OTP…' : 'Submit Registration'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-2">
          <div className="flex w-full flex-col gap-1">
            <label htmlFor="admin-signup-otp" className={FIELD_LABEL}>
              Email OTP
            </label>
            <Input
              id="admin-signup-otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center font-mono tracking-[0.35em]"
              compact
              required
            />
          </div>
          <Button type="submit" className="mt-2 w-full" disabled={pending || otp.length !== 6}>
            {pending ? 'Verifying…' : 'Verify OTP'}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            onClick={() => {
              setStep('details');
              setOtp('');
              setError(null);
              setInfo(null);
            }}
          >
            Edit registration details
          </button>
        </form>
      )}
    </div>
  );
}
