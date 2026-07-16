'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IndianCityAutocomplete, parseIndianDistrictSelection } from '@/components/shared/IndianCityAutocomplete';
import { formatMobileDisplay, stripMobileDigits, validateMobile } from '@/lib/validation/mobile';
import { upsertServiceProviderProfileAction } from '@/app/actions/serviceProvider';
import {
  getBiddingSignupRedirect,
  getTradeCategorySlug,
  SERVICE_PROVIDER_SIGNUP_ROLES,
} from '@/lib/auth/serviceProviderSignupRoles';
import type { ServiceCategory } from '@/lib/types/hireServices';

type Step = 'role' | 'phone' | 'otp' | 'profile';

interface ProviderSignupFormProps {
  categories: ServiceCategory[];
}

function RoleSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">
        Your role
      </label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full h-11">
          <SelectValue placeholder="Select your role" />
        </SelectTrigger>
        <SelectContent>
          {SERVICE_PROVIDER_SIGNUP_ROLES.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProviderSignupForm({ categories }: ProviderSignupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('role');
  const [providerRole, setProviderRole] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [district, setDistrict] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [startingRate, setStartingRate] = useState('');
  const [bio, setBio] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const tradeCategorySlug = providerRole ? getTradeCategorySlug(providerRole) : null;
  const tradeCategoryId = useMemo(() => {
    if (!tradeCategorySlug) return null;
    return categories.find((c) => c.slug === tradeCategorySlug)?.id ?? null;
  }, [categories, tradeCategorySlug]);

  const roleLabel =
    SERVICE_PROVIDER_SIGNUP_ROLES.find((r) => r.value === providerRole)?.label ?? '';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [supabase.auth]);

  function toE164(digits: string) {
    const d = stripMobileDigits(digits);
    if (d.length === 10) return `+91${d}`;
    if (d.startsWith('91') && d.length === 12) return `+${d}`;
    return `+${d}`;
  }

  function continueFromRole() {
    setError(null);
    if (!providerRole) {
      setError('Please select your role.');
      return;
    }
    const redirect = getBiddingSignupRedirect(providerRole);
    if (redirect) {
      router.push(redirect);
      return;
    }
    if (!getTradeCategorySlug(providerRole)) {
      setError('Please select a valid role.');
      return;
    }
    setStep('phone');
  }

  async function sendOtp() {
    const mobileError = validateMobile(phone);
    if (mobileError) {
      setError(mobileError);
      return;
    }
    setPending(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: toE164(phone),
    });
    setPending(false);
    if (otpError) {
      setError(
        otpError.message.includes('phone')
          ? `${otpError.message} Ensure phone auth is enabled in Supabase, or try again.`
          : otpError.message,
      );
      return;
    }
    setStep('otp');
  }

  async function verifyOtp() {
    if (otp.trim().length < 4) {
      setError('Enter the verification code from SMS.');
      return;
    }
    setPending(true);
    setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: otp.trim(),
      type: 'sms',
    });
    setPending(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    if (data.user) setUserId(data.user.id);
    setStep('profile');
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!providerRole || !tradeCategorySlug) {
      setError('Please select your role.');
      return;
    }

    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set('full_name', fullName);
    formData.set('phone', stripMobileDigits(phone));
    formData.set('district', district);
    formData.set('starting_rate', startingRate);
    formData.set('bio', bio);
    if (tradeCategoryId) {
      formData.append('category_ids', tradeCategoryId);
    } else {
      formData.set('category_slug', tradeCategorySlug);
    }

    const result = await upsertServiceProviderProfileAction({ error: null, success: false }, formData);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push('/provider/dashboard');
    router.refresh();
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Link
        href="/signup"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="flex justify-center mb-6">
        <BuilBidLogo size="lg" />
      </div>

      <h1 className="text-2xl font-bold text-foreground text-center tracking-tight mb-2">
        Service Provider Sign Up
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Choose your role, then complete your profile to go live on Hire Services.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {step === 'role' && (
        <div className="space-y-4">
          <RoleSelect value={providerRole} onChange={setProviderRole} id="provider-role-start" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Labour contractors and construction firms continue to the existing email registration.
            Trade professionals verify mobile and list under Hire Services.
          </p>
          <Button type="button" className="w-full gap-2" onClick={continueFromRole}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-4">
          <RoleSelect
            value={providerRole}
            onChange={(val) => {
              setProviderRole(val);
              const redirect = getBiddingSignupRedirect(val);
              if (redirect) router.push(redirect);
            }}
            id="provider-role-phone"
          />
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Mobile number</label>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              value={phone}
              onChange={(e) => setPhone(formatMobileDisplay(e.target.value))}
            />
          </div>
          <Button type="button" className="w-full" onClick={sendOtp} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => setStep('role')}
          >
            Back
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {roleLabel} · Code sent to {phone}
          </p>
          <Input
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
          />
          <Button type="button" className="w-full" onClick={verifyOtp} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Continue'}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => setStep('phone')}
          >
            Change number
          </button>
        </div>
      )}

      {step === 'profile' && (
        <form onSubmit={submitProfile} className="space-y-4">
          {!userId && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Complete phone verification above to continue.
            </p>
          )}
          <RoleSelect
            value={providerRole}
            onChange={(val) => {
              setProviderRole(val);
              const redirect = getBiddingSignupRedirect(val);
              if (redirect) router.push(redirect);
            }}
            id="provider-role-profile"
          />
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Full name</label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">District</label>
            <IndianCityAutocomplete
              value={locationLabel}
              onChange={(val) => {
                setLocationLabel(val);
                const parsed = parseIndianDistrictSelection(val);
                if (parsed?.district) setDistrict(parsed.district);
              }}
              placeholder="Search city / district"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Starting rate (optional, ₹)
            </label>
            <Input
              type="number"
              min={0}
              step="1"
              placeholder="e.g. 500"
              value={startingRate}
              onChange={(e) => setStartingRate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Bio (optional)</label>
            <textarea
              className="flex min-h-[88px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief intro for clients…"
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={pending || !userId}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Go live <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            You&apos;ll be listed under {roleLabel || 'your trade'} — verification badge is optional later.
          </p>
        </form>
      )}
    </div>
  );
}
