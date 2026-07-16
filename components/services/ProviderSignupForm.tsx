'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BuilBidLogo } from '@/components/shared/BuilBidLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IndianCityAutocomplete, parseIndianDistrictSelection } from '@/components/shared/IndianCityAutocomplete';
import { formatMobileDisplay, stripMobileDigits, validateMobile } from '@/lib/validation/mobile';
import { upsertServiceProviderProfileAction } from '@/app/actions/serviceProvider';
import type { ServiceCategory } from '@/lib/types/hireServices';
import { cn } from '@/lib/utils';

type Step = 'phone' | 'otp' | 'profile';

interface ProviderSignupFormProps {
  categories: ServiceCategory[];
}

export function ProviderSignupForm({ categories }: ProviderSignupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [district, setDistrict] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startingRate, setStartingRate] = useState('');
  const [bio, setBio] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setStep('profile');
      }
    });
  }, [supabase.auth]);

  function toE164(digits: string) {
    const d = stripMobileDigits(digits);
    if (d.length === 10) return `+91${d}`;
    if (d.startsWith('91') && d.length === 12) return `+${d}`;
    return `+${d}`;
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

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set('full_name', fullName);
    formData.set('phone', stripMobileDigits(phone));
    formData.set('district', district);
    formData.set('starting_rate', startingRate);
    formData.set('bio', bio);
    selectedCategories.forEach((id) => formData.append('category_ids', id));

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
        Join BuilBid to receive callback requests from clients in your district.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-4">
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
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Code sent to {phone}</p>
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
            <label className="text-sm font-medium text-foreground mb-2 block">Services you offer</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const selected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                        : 'border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/50',
                    )}
                  >
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </button>
                );
              })}
            </div>
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
            You&apos;ll be listed immediately — verification badge is optional later.
          </p>
        </form>
      )}
    </div>
  );
}
