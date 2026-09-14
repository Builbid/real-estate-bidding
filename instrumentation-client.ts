import * as Sentry from '@sentry/nextjs';
import { getSentrySharedOptions } from '@/lib/sentry/options';

// Next.js App Router client instrumentation (Sentry v8+/v10 preferred entry).
Sentry.init({
  ...getSentrySharedOptions(),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
