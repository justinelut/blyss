"use client";

import { captureClientException } from "@/lib/monitoring/sentry-client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * 500 — editorial server error page.
 */
export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    captureClientException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 text-center">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--danger)]">
        Error · 500
      </span>

      <h1 className="mt-6 max-w-[20ch] font-display font-semibold tracking-[-0.025em] leading-[1] text-[clamp(40px,6vw,80px)] text-[var(--text-primary)]">
        Something broke on our side.
      </h1>

      <p className="mt-6 max-w-[48ch] font-sans text-[18px] leading-[1.55] text-[var(--text-secondary)]">
        The team&rsquo;s been notified. Try refreshing in a minute — most issues
        clear themselves up.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-10 inline-flex h-12 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-sans text-[14px] font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        <RefreshCw size={15} />
        Refresh
      </button>
    </div>
  );
}
