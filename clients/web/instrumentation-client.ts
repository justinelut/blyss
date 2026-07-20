// This file configures the initialization of Sentry on the client.
// Browser monitoring is loaded on demand so passive public page views do not
// pay the SDK's download and execution cost.

import {
  captureClientException,
  getSentryClient,
} from "@/lib/monitoring/sentry-client";
import { CONFIG } from "@/utils/config";

type SentryClient = typeof import("@sentry/nextjs");
type RouterTransitionArgs = Parameters<
  SentryClient["captureRouterTransitionStart"]
>;

if (CONFIG.SENTRY_DSN && typeof window !== "undefined") {
  const startMonitoring = () => {
    window.removeEventListener("pointerdown", startMonitoring);
    window.removeEventListener("keydown", startMonitoring);
    void getSentryClient();
  };

  window.addEventListener("pointerdown", startMonitoring, {
    once: true,
    passive: true,
  });
  window.addEventListener("keydown", startMonitoring, { once: true });
  window.addEventListener(
    "error",
    (event) => captureClientException(event.error ?? event.message),
    { once: true },
  );
  window.addEventListener(
    "unhandledrejection",
    (event) => captureClientException(event.reason),
    { once: true },
  );
}

export const onRouterTransitionStart = (
  ...args: RouterTransitionArgs
): void => {
  void getSentryClient().then((Sentry) =>
    Sentry?.captureRouterTransitionStart(...args),
  );
};
