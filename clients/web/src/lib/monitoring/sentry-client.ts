import { CONFIG } from "@/utils/config";

type SentryClient = typeof import("@sentry/nextjs");

let sentryClientPromise: Promise<SentryClient> | undefined;

/**
 * Load and initialize browser monitoring only when it can be used. Passive,
 * anonymous page views do not need to download the Sentry SDK; errors,
 * authenticated identity, and client navigations still initialize it.
 */
export const getSentryClient = (): Promise<SentryClient | null> => {
  if (!CONFIG.SENTRY_DSN) return Promise.resolve(null);

  sentryClientPromise ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: CONFIG.SENTRY_DSN,
      environment: CONFIG.ENVIRONMENT,
      integrations: [
        Sentry.httpClientIntegration(),
        Sentry.browserTracingIntegration(),
      ],
      tracesSampleRate: 0.1,
      tracePropagationTargets: [/^https:\/\/api\.blyss\.co\.ke/],
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      debug: false,
      ignoreErrors: [/WeakMap key undefined/i],
      beforeSend: (event) => {
        if (
          event.request?.url?.includes("/ingest/flags") ||
          event.request?.url?.includes("/ingest/batch")
        ) {
          return null;
        }
        return event;
      },
    });
    return Sentry;
  });

  return sentryClientPromise;
};

export const captureClientException = (error: unknown): void => {
  void getSentryClient().then((Sentry) => Sentry?.captureException(error));
};
