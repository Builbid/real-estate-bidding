'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
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
import { registerTradeProviderAction } from '@/app/actions/serviceProvider';
import {
  getBiddingSignupRedirect,
  getTradeCategorySlug,
  SERVICE_PROVIDER_SIGNUP_ROLES,
} from '@/lib/auth/serviceProviderSignupRoles';

type Step = 'role' | 'account';

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

export function ProviderSignupForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('role');
  const [providerRole, setProviderRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [startingRate, setStartingRate] = useState('');
  const [bio, setBio] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tradeCategorySlug = providerRole ? getTradeCategorySlug(providerRole) : null;

  const roleLabel =
    SERVICE_PROVIDER_SIGNUP_ROLES.find((r) => r.value === providerRole)?.label ?? '';

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
    setStep('account');
  }

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!providerRole || !tradeCategorySlug) {
      setError('Please select your role.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (validateMobile(phone)) {
      setError(validateMobile(phone));
      return;
    }

    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set('full_name', fullName);
    formData.set('email', email);
    formData.set('password', password);
    formData.set('phone', stripMobileDigits(phone));
    formData.set('district', district);
    formData.set('starting_rate', startingRate);
    formData.set('bio', bio);
    if (tradeCategorySlug) {
      formData.set('category_slug', tradeCategorySlug);
    }

    const result = await registerTradeProviderAction({ error: null, success: false }, formData);
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
        Create an account with email and password — same as other BuilBid users.
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
            Labour contractors and construction firms use the existing bidder registration. Trade
            professionals (painter, plumber, etc.) create an email account here for Hire Services.
          </p>
          <Button type="button" className="w-full gap-2" onClick={continueFromRole}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already registered?{' '}
            <Link href="/login?next=/provider/dashboard" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}

      {step === 'account' && (
        <form onSubmit={submitAccount} className="space-y-4">
          <RoleSelect
            value={providerRole}
            onChange={(val) => {
              setProviderRole(val);
              const redirect = getBiddingSignupRedirect(val);
              if (redirect) router.push(redirect);
            }}
            id="provider-role-account"
          />

          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            prefix={<Mail className="w-3.5 h-3.5" />}
          />

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Password
            </span>
            <Input
              type={showPw ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              prefix={<Lock className="w-3.5 h-3.5" />}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-muted-foreground hover:text-foreground/80"
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Full name</label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Mobile number</label>
            <Input
              type="tel"
              inputMode="numeric"
              required
              placeholder="10-digit mobile"
              value={phone}
              onChange={(e) => setPhone(formatMobileDisplay(e.target.value))}
            />
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

          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
          </Button>

          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => setStep('role')}
          >
            Back
          </button>

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Listed under {roleLabel || 'your trade'} — optional Verified badge later.
          </p>
        </form>
      )}
    </div>
  );
}
