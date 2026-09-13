import * as Sentry from '@sentry/nextjs';
import { getSentrySharedOptions } from '@/lib/sentry/options';

Sentry.init({
  ...getSentrySharedOptions(),
  // Session replay is expensive — keep off by default for faster page loads.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
