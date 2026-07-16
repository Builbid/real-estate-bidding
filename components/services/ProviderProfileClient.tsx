'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Phone, Star } from 'lucide-react';
import { VerifiedBadge } from '@/components/services/VerifiedBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCallbackRequestAction } from '@/app/actions/callbackRequest';
import { formatMobileDisplay, stripMobileDigits } from '@/lib/validation/mobile';
import type { ServiceProviderPublic } from '@/lib/types/hireServices';

interface ProviderProfileClientProps {
  provider: ServiceProviderPublic;
  isLoggedIn: boolean;
  loginNext: string;
}

export function ProviderProfileClient({ provider, isLoggedIn, loginNext }: ProviderProfileClientProps) {
  const [state, formAction, pending] = useActionState(createCallbackRequestAction, {
    error: null,
    success: false,
  });
  const [clientPhone, setClientPhone] = useState('');

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          <UserAvatar
            name={provider.full_name}
            avatarUrl={provider.avatar_url}
            size="xl"
            gradient="from-emerald-500 to-teal-600"
            className="shrink-0 mx-auto sm:mx-0"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{provider.full_name}</h1>
              {provider.is_verified && <VerifiedBadge />}
            </div>
            <p className="text-muted-foreground">{provider.district}</p>

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {provider.rating_avg.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({provider.review_count} review{provider.review_count === 1 ? '' : 's'})
                </span>
              </span>
              {provider.starting_rate != null && (
                <span>
                  <span className="text-muted-foreground">Starting from </span>
                  <span className="font-semibold">₹{Number(provider.starting_rate).toLocaleString('en-IN')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {provider.bio && (
          <p className="mt-4 text-sm text-foreground/90 leading-relaxed">{provider.bio}</p>
        )}

        {provider.work_photo_urls.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Work photos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {provider.work_photo_urls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="rounded-lg aspect-[4/3] object-cover border border-border"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Phone className="h-4 w-4 text-emerald-600" />
            Request callback
          </div>
          <p className="text-xs text-muted-foreground">
            Share your number so the provider can call you. Their number is never shown on this page.
          </p>

          {state.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Request sent! The provider will contact you soon.
            </p>
          ) : !isLoggedIn ? (
            <Button asChild className="w-full">
              <Link href={`/login?next=${encodeURIComponent(loginNext)}`}>Sign in to request callback</Link>
            </Button>
          ) : (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="provider_id" value={provider.id} />
              <Input
                name="client_phone"
                type="tel"
                required
                placeholder="Your mobile number"
                value={clientPhone}
                onChange={(e) => setClientPhone(formatMobileDisplay(e.target.value))}
                onBlur={() => {
                  if (clientPhone) {
                    setClientPhone(formatMobileDisplay(stripMobileDigits(clientPhone)));
                  }
                }}
              />
              {state.error && <p className="text-xs text-red-500">{state.error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Sending…' : 'Request callback'}
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-border p-5 flex flex-col justify-center items-center text-center gap-2">
          <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">Message</p>
          <p className="text-xs text-muted-foreground">Coming soon — in-app chat is on the way.</p>
          <Button variant="outline" disabled className="mt-2">
            Coming soon
          </Button>
        </div>
      </div>
    </div>
  );
}
