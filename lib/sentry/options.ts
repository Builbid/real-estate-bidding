import type { BrowserOptions, NodeOptions } from '@sentry/nextjs';

/** Shared Sentry init — production-only, low sample rates to cut envelope spam. */
export function getSentrySharedOptions(): Pick<
  BrowserOptions & NodeOptions,
  | 'dsn'
  | 'enabled'
  | 'tracesSampleRate'
  | 'profilesSampleRate'
  | 'sendDefaultPii'
  | 'environment'
> {
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    process.env.SENTRY_DSN?.trim() ||
    undefined;
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    dsn,
    // Never send telemetry from local/dev — avoids envelope noise during development.
    enabled: isProduction && Boolean(dsn),
    tracesSampleRate: 0.02,
    profilesSampleRate: 0,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
  };
}
