"use client";

import { cookieConsentGiven } from "@/components/Privacy/CookieConsent";
import { NavigationHistoryProvider } from "@/providers/navigationHistory";
import {
  createDeferredPostHogClient,
  PostHogClientContext,
  type PostHogClient,
} from "@/providers/posthog";
import { getQueryClient } from "@/utils/api/query";
import { CONFIG } from "@/utils/config";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

export { NavigationHistoryProvider };

let postHogClientPromise: Promise<PostHogClient> | undefined;

const loadPostHog = (
  token: string,
  distinctId: string,
): Promise<PostHogClient> => {
  postHogClientPromise ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(token, {
      ui_host: "https://us.i.posthog.com",
      api_host: "/ingest",
      defaults: "2025-05-24",
      persistence: cookieConsentGiven() === "yes" ? "localStorage" : "memory",
      bootstrap: {
        distinctID: distinctId,
      },
    });
    return posthog as unknown as PostHogClient;
  });

  return postHogClientPromise;
};

export function PolarPostHogProvider({
  children,
  distinctId,
}: {
  children: React.ReactNode;
  distinctId: string;
}) {
  const deferred = useMemo(
    () => createDeferredPostHogClient(distinctId),
    [distinctId],
  );

  useEffect(() => {
    if (!CONFIG.POSTHOG_TOKEN) {
      deferred.clear();
      return;
    }

    let active = true;
    let started = false;
    const startAnalytics = () => {
      if (started) return;
      started = true;
      window.removeEventListener("pointerdown", startAnalytics, true);
      window.removeEventListener("keydown", startAnalytics, true);
      void loadPostHog(CONFIG.POSTHOG_TOKEN, distinctId).then((client) => {
        if (active) deferred.connect(client);
      });
    };

    window.addEventListener("pointerdown", startAnalytics, {
      capture: true,
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", startAnalytics, {
      capture: true,
      once: true,
    });
    const fallback = window.setTimeout(startAnalytics, 15_000);

    return () => {
      active = false;
      window.clearTimeout(fallback);
      window.removeEventListener("pointerdown", startAnalytics, true);
      window.removeEventListener("keydown", startAnalytics, true);
    };
  }, [deferred, distinctId]);

  return (
    <PostHogClientContext.Provider value={deferred.client}>
      {children}
    </PostHogClientContext.Provider>
  );
}

export function PolarThemeProvider({
  children,
  forceTheme,
}: {
  children: React.ReactNode;
  forceTheme?: "light" | "dark";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme");

  const PAGES_WITH_FORCED_DARK_THEME: string[] = ["/midday/portal"];
  const forcedTheme = PAGES_WITH_FORCED_DARK_THEME.some((path) =>
    pathname.includes(path),
  )
    ? "dark"
    : forceTheme;

  const requestedTheme =
    theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <ThemeProvider
      defaultTheme="dark"
      enableSystem
      attribute="class"
      storageKey="blyss-theme"
      disableTransitionOnChange
      forcedTheme={requestedTheme ?? forcedTheme}
    >
      <LegacyThemePreferenceMigration />
      {children}
    </ThemeProvider>
  );
}

/**
 * The account preferences page previously stored the choice under `theme`
 * and toggled the document class directly. Move existing choices into the
 * shared next-themes preference once so all theme controls stay in sync.
 */
function LegacyThemePreferenceMigration() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const legacyTheme = window.localStorage.getItem("theme");
    if (!legacyTheme) return;

    const hasSharedPreference = window.localStorage.getItem("blyss-theme");
    if (
      !hasSharedPreference &&
      (legacyTheme === "light" ||
        legacyTheme === "dark" ||
        legacyTheme === "system")
    ) {
      setTheme(legacyTheme);
    }

    window.localStorage.removeItem("theme");
  }, [setTheme]);

  return null;
}

export function PolarQueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
