'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2, User, Mail, Lock, Phone, MapPin, Eye, EyeOff,
  ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, HardHat, Building,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

type Step = 1 | 2 | 3;

interface FormState {
  role: 'owner' | 'builder';
  full_name: string;
  email: string;
  password: string;
  mobile: string;
  physical_address: string;
  pincode: string;
}

const ROLE_CARDS = [
  {
    role: 'owner' as const,
    icon: Building,
    title: 'Project Owner',
    description: 'Post construction projects and receive competitive bids from verified builders.',
    features: ['Upload project specs', 'Receive 24h bids', 'Select the best builder'],
    color: 'teal',
  },
  {
    role: 'builder' as const,
    icon: HardHat,
    title: 'Builder / Contractor',
    description: 'Browse real estate projects and submit rate-based bids to win contracts.',
    features: ['Browse live auctions', 'Submit competitive rates', 'Win construction contracts'],
    color: 'emerald',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]     = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm]     = useState<FormState>({
    role: 'builder',
    full_name: '', email: '', password: '',
    mobile: '', physical_address: '', pincode: '',
  });

  const supabase = createClient();
  const update   = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: form.role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').update({
        mobile: form.mobile || null,
        physical_address: form.physical_address || null,
        pincode: form.pincode || null,
      }).eq('id', data.user.id);

      setStep(3);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Link href="/" className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
            <Building2 className="w-7 h-7 text-emerald-400" />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
            <p className="text-sm text-slate-400 mt-1">Join BidEstate — the professional construction bidding platform</p>
          </div>
        </div>

        {/* Progress dots */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {([1, 2] as const).map((s) => (
              <div key={s} className={cn('h-1.5 rounded-full transition-all duration-300', s <= step ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-700')} />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm shadow-2xl p-8">
          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-3 mb-6 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* STEP 1: Role Selection */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-4">Select your account type</p>
              <div className="space-y-3 mb-6">
                {ROLE_CARDS.map(({ role, icon: Icon, title, description, features, color }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => update('role', role)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all duration-200',
                      form.role === role
                        ? color === 'teal'
                          ? 'border-teal-500/50 bg-teal-500/5'
                          : 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                        form.role === role
                          ? color === 'teal' ? 'bg-teal-500/20' : 'bg-emerald-500/20'
                          : 'bg-slate-800'
                      )}>
                        <Icon className={cn('w-5 h-5', form.role === role ? color === 'teal' ? 'text-teal-400' : 'text-emerald-400' : 'text-slate-500')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-white">{title}</p>
                          {form.role === role && (
                            <CheckCircle2 className={cn('w-4 h-4', color === 'teal' ? 'text-teal-400' : 'text-emerald-400')} />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{description}</p>
                        <div className="flex flex-wrap gap-1">
                          {features.map((f) => (
                            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Button size="lg" className="w-full" onClick={() => setStep(2)}>
                Continue as {form.role === 'owner' ? 'Project Owner' : 'Builder'} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: Account Details */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm font-semibold text-slate-300 mb-2">
                {form.role === 'owner' ? '🏗️ Project Owner' : '👷 Builder'} — Account Details
              </p>

              <Input label="Full Name" type="text" placeholder="Your full name" value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                prefix={<User className="w-3.5 h-3.5" />} required />

              <Input label="Email Address" type="email" placeholder="you@example.com" value={form.email}
                onChange={(e) => update('email', e.target.value)}
                prefix={<Mail className="w-3.5 h-3.5" />} required autoComplete="email" />

              <div className="flex flex-col gap-1.5">
                <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                  value={form.password} onChange={(e) => update('password', e.target.value)}
                  prefix={<Lock className="w-3.5 h-3.5" />}
                  suffix={
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  }
                  required minLength={8} autoComplete="new-password" />
              </div>

              <Input label="Mobile Number" type="tel" placeholder="+91 98765 43210" value={form.mobile}
                onChange={(e) => update('mobile', e.target.value)}
                prefix={<Phone className="w-3.5 h-3.5" />} />

              <Input label="Address (optional)" type="text" placeholder="City, State" value={form.physical_address}
                onChange={(e) => update('physical_address', e.target.value)}
                prefix={<MapPin className="w-3.5 h-3.5" />} />

              <Input label="Pincode (optional)" type="text" placeholder="e.g. 781001" value={form.pincode}
                onChange={(e) => update('pincode', e.target.value)} />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button type="submit" size="lg" className="flex-1" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
                <p className="text-sm text-slate-400">
                  Check your email <span className="text-white font-semibold">{form.email}</span> to confirm your account.
                </p>
              </div>
              <Button size="lg" className="w-full" onClick={() => router.push('/login')}>
                Go to Sign In <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {step < 3 && (
          <p className="text-center mt-6 text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
