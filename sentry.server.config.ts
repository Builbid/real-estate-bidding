import * as Sentry from '@sentry/nextjs';
import { getSentrySharedOptions } from '@/lib/sentry/options';

Sentry.init({
  ...getSentrySharedOptions(),
});
