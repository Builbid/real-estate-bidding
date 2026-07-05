'use client';

import { Suspense, useRef, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, User, Mail, Lock, Phone, MapPin, Eye, EyeOff,
  ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Check, X,
} from 'lucide-react';
import { signUpAction, type SignUpRole } from '@/app/actions/auth';
import { uploadBuilderAvatar } from '@/lib/avatar/uploadBuilderAvatar';
import { uploadFirmLogo } from '@/lib/firm/uploadFirmLogo';
import { AvatarUpload } from '@/components/builder/AvatarUpload';
import { LogoUpload } from '@/components/firm/LogoUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { validateGstNumber, isValidGstNumber } from '@/lib/validation/gst';
import { formatMobileDisplay, stripMobileDigits, validateMobile } from '@/lib/validation/mobile';
import {
  getPasswordStrength,
  PASSWORD_STRENGTH_COLOR,
  PASSWORD_STRENGTH_LABEL,
} from '@/lib/validation/passwordStrength';

type Step = 1 | 2 | 3;

type RegisterRole = SignUpRole | null;

const ROLE_CARDS = [
  {
    role: 'owner' as const,
    emoji: '🏠',
    title: 'Project Owner',
    subtitle: 'I want to build a house or construction project',
    bullets: [
      'Post your project for free',
      'Receive competitive bids',
      'Choose your contractor or firm',
    ],
    noteBadge: null,
    accent: 'teal',
  },
  {
    role: 'labour_contractor' as const,
    emoji: '👷',
    title: 'Labour Contractor',
    subtitle: 'I provide construction labour & skilled workers',
    bullets: [
      'Browse live labour contract auctions',
      'Bid your best ₹/sqft rate',
      'Win construction contracts',
    ],
    noteBadge: 'Owner supplies material',
    accent: 'emerald',
  },
  {
    role: 'construction_firm' as const,
    emoji: '🏗️',
    title: 'Construction Firm',
    subtitle: 'We handle everything — material, labour & finishing',
    bullets: [
      'Browse turnkey construction projects',
      'Bid your complete ₹/sqft rate',
      'Deliver the full project end-to-end',
    ],
    noteBadge: 'You supply material + labour',
    accent: 'violet',
  },
];

type RoleParam = 'owner' | 'bidder' | null;

function parseRoleParam(value: string | null): RoleParam {
  if (value === 'owner' || value === 'bidder') return value;
  return null;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = parseRoleParam(searchParams.get('role'));

  const [step, setStep] = useState<Step>(() => (roleParam === 'owner' ? 2 : 1));
  const [role, setRole] = useState<RegisterRole>(() => (roleParam === 'owner' ? 'owner' : null));
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const fieldErrors = useMemo(() => {
    const errs: Record<string, string | null> = {};
    if (touched.full_name && !fullName.trim()) errs.full_name = 'Full name is required.';
    if (touched.email && !email.trim()) errs.email = 'Email is required.';
    if (touched.password && password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (touched.mobile) errs.mobile = validateMobile(mobile);
    if (role === 'construction_firm') {
      if (touched.company_name && companyName.trim().length < 3) {
        errs.company_name = 'Company name is required (min 3 characters).';
      }
      if (touched.gst_number) errs.gst_number = validateGstNumber(gstNumber);
    }
    return errs;
  }, [touched, fullName, email, password, mobile, role, companyName, gstNumber]);

  const isFormValid = useMemo(() => {
    if (!fullName.trim() || !email.trim() || password.length < 8) return false;
    if (validateMobile(mobile)) return false;
    if (role === 'construction_firm') {
      if (companyName.trim().length < 3) return false;
      if (validateGstNumber(gstNumber)) return false;
    }
    return true;
  }, [fullName, email, password, mobile, role, companyName, gstNumber]);

  function touch(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function handleMobileChange(value: string) {
    setMobile(formatMobileDisplay(value));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current || !role) return;

    setTouched({
      full_name: true,
      email: true,
      password: true,
      mobile: true,
      company_name: true,
      gst_number: true,
    });

    if (!isFormValid) return;

    setPending(true);
    setError(null);

    const formData = new FormData(formRef.current);
    formData.set('role', role);
    formData.set('mobile', stripMobileDigits(mobile));

    const result = await signUpAction({ error: null, success: false }, formData);

    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    if (result.autoSignedIn) {
      if (role === 'labour_contractor' && avatarFile) {
        await uploadBuilderAvatar(avatarFile);
      }
      if (role === 'construction_firm' && logoFile) {
        await uploadFirmLogo(logoFile);
      }

      setSuccessFlash(true);
      setTimeout(() => {
        router.push(result.redirectPath ?? '/dashboard');
      }, 600);
      return;
    }

    setEmailConfirmPending(true);
    setStep(3);
    setPending(false);
  }

  const roleLabel =
    role === 'owner'
      ? 'Project Owner'
      : role === 'labour_contractor'
        ? 'Labour Contractor'
        : role === 'construction_firm'
          ? 'Construction Firm'
          : '';

  const visibleCards = useMemo(() => {
    if (roleParam === 'owner') return ROLE_CARDS.filter((c) => c.role === 'owner');
    if (roleParam === 'bidder') return ROLE_CARDS.filter((c) => c.role !== 'owner');
    return ROLE_CARDS;
  }, [roleParam]);

  const pageSubtitle =
    roleParam === 'owner'
      ? 'Create your owner account to post your construction project'
      : roleParam === 'bidder'
        ? 'Create your account to start bidding on construction projects'
        : 'Join BuilBid — the professional construction bidding platform';

  const loginHref = roleParam ? `/login?role=${roleParam}` : '/login';

  return (
    <div className="flex-1 bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {roleParam && (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        )}

        <div className="flex flex-col items-center gap-3 mb-8">
          <Link href="/" className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
            <Building2 className="w-7 h-7 text-emerald-400" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">{pageSubtitle}</p>
          </div>
        </div>

        {step < 3 && !emailConfirmPending && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {([1, 2] as const).map((s) => (
              <div key={s} className={cn('h-1.5 rounded-full transition-all duration-300', s <= step ? 'w-8 bg-emerald-500' : 'w-4 bg-muted')} />
            ))}
          </div>
        )}

        <div className={cn(
          'rounded-2xl border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm shadow-2xl p-8 transition-all',
          successFlash && 'ring-2 ring-emerald-500/50',
        )}>

          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-foreground/80 mb-4">How will you use BuilBid?</p>
              <div className="space-y-3 mb-6">
                {visibleCards.map((card) => {
                  const selected = role === card.role;
                  const isFirm = card.role === 'construction_firm';
                  return (
                    <button
                      key={card.role}
                      type="button"
                      onClick={() => setRole(card.role)}
                      className={cn(
                        'w-full text-left px-4 py-4 rounded-xl border-2 transition-all duration-200 transform',
                        selected && 'scale-[1.01]',
                        selected && card.accent === 'teal' && 'border-teal-500/60 bg-teal-500/5 shadow-md shadow-teal-500/10',
                        selected && card.accent === 'emerald' && 'border-emerald-500/60 bg-emerald-500/5 shadow-md shadow-emerald-500/10',
                        selected && card.accent === 'violet' && 'border-violet-500/70 bg-violet-500/8 shadow-lg shadow-violet-500/15 ring-1 ring-violet-500/20',
                        !selected && 'border-border bg-secondary/30 hover:border-muted-foreground/30 hover:bg-secondary/50',
                        isFirm && !selected && 'border-violet-500/20 bg-violet-500/[0.03]',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0 leading-none">{card.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-sm font-bold text-foreground">{card.title}</p>
                            {selected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug mb-2">{card.subtitle}</p>
                          <ul className="space-y-0.5 mb-2">
                            {card.bullets.map((b) => (
                              <li key={b} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">•</span>
                                {b}
                              </li>
                            ))}
                          </ul>
                          {card.noteBadge && (
                            <span className={cn(
                              'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full',
                              isFirm ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25' : 'bg-secondary text-muted-foreground border border-border',
                            )}>
                              {card.noteBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button size="lg" className="w-full" disabled={!role} onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 2 && !emailConfirmPending && role && (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="role" value={role} />

              <p className="text-sm font-semibold text-foreground/80 mb-2">
                {roleLabel} — Account Details
              </p>

              {role === 'labour_contractor' && (
                <AvatarUpload
                  fullName={fullName.trim() || 'Contractor'}
                  deferred
                  registration
                  onFileSelected={setAvatarFile}
                />
              )}

              {role === 'construction_firm' && (
                <LogoUpload
                  companyName={companyName.trim() || 'Firm'}
                  deferred
                  onFileSelected={setLogoFile}
                />
              )}

              {error && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {role === 'construction_firm' && (
                <>
                  <div>
                    <Input
                      label="Company / Firm Name *"
                      name="company_name"
                      type="text"
                      placeholder="e.g. Sharma Construction Pvt. Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onBlur={() => touch('company_name')}
                      required
                    />
                    {fieldErrors.company_name && (
                      <p className="text-xs text-red-400 mt-1">{fieldErrors.company_name}</p>
                    )}
                  </div>

                  <div>
                    <Input
                      label="GST Number *"
                      name="gst_number"
                      type="text"
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      onBlur={() => touch('gst_number')}
                      required
                      maxLength={15}
                      suffix={
                        gstNumber.length === 15 ? (
                          isValidGstNumber(gstNumber) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-red-400" />
                          )
                        ) : undefined
                      }
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">15-character GST Identification Number</p>
                    {fieldErrors.gst_number && (
                      <p className="text-xs text-red-400 mt-1">{fieldErrors.gst_number}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/80 mt-1.5">
                      GST number is required to participate in construction firm bidding on BuilBid
                    </p>
                  </div>

                  <div>
                    <Input
                      label="Years in Business"
                      name="years_in_business"
                      type="number"
                      placeholder="e.g. 8"
                      min={0}
                      max={100}
                      value={yearsInBusiness}
                      onChange={(e) => setYearsInBusiness(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">How many years has your firm been operating?</p>
                  </div>
                </>
              )}

              <div>
                <Input
                  label="Full Name *"
                  name="full_name"
                  type="text"
                  placeholder="Your full name"
                  prefix={<User className="w-3.5 h-3.5" />}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => touch('full_name')}
                />
                {fieldErrors.full_name && <p className="text-xs text-red-400 mt-1">{fieldErrors.full_name}</p>}
              </div>

              <div>
                <Input
                  label="Email Address *"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  prefix={<Mail className="w-3.5 h-3.5" />}
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch('email')}
                />
                {fieldErrors.email && <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <Input
                  label="Password *"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  prefix={<Lock className="w-3.5 h-3.5" />}
                  suffix={
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-foreground/80 transition-colors">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => touch('password')}
                />
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn('h-full transition-all', PASSWORD_STRENGTH_COLOR[passwordStrength])}
                        style={{ width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%' }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{PASSWORD_STRENGTH_LABEL[passwordStrength]}</span>
                  </div>
                )}
                {fieldErrors.password && <p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>}
              </div>

              <div>
                <Input
                  label="Mobile Number *"
                  name="mobile"
                  type="tel"
                  placeholder="98765 43210"
                  prefix={<span className="text-xs font-medium text-muted-foreground">+91</span>}
                  required
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  onBlur={() => touch('mobile')}
                />
                {fieldErrors.mobile && <p className="text-xs text-red-400 mt-1">{fieldErrors.mobile}</p>}
              </div>

              <Input
                label="Address / City, State"
                name="physical_address"
                type="text"
                placeholder="City, State"
                prefix={<MapPin className="w-3.5 h-3.5" />}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <Input
                label="Pincode"
                name="pincode"
                type="text"
                placeholder="e.g. 781001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                {roleParam === 'owner' ? (
                  <Button type="button" variant="outline" size="lg" className="flex-1" asChild>
                    <Link href="/"><ArrowLeft className="w-4 h-4" /> Back</Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                )}
                <Button type="submit" size="lg" className="flex-1" disabled={pending || !isFormValid}>
                  {pending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {(step === 3 || emailConfirmPending) && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Account Created!</h2>
                <p className="text-sm text-muted-foreground">
                  Check your email <span className="text-foreground font-semibold">{email}</span> to confirm your account, then sign in.
                </p>
              </div>
              <Link href={loginHref} className="w-full">
                <Button size="lg" className="w-full">
                  Go to Sign In <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {(step === 1 || (step === 2 && roleParam === 'owner' && !emailConfirmPending)) && (
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href={loginHref} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-4">
          <span className="w-6 h-6 rounded-full border-2 border-border border-t-emerald-500 animate-spin" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
