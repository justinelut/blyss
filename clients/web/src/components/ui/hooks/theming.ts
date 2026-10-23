import type { StripeElementsOptions } from "@stripe/stripe-js";

export interface ThemingPresetProps {
  stripe: NonNullable<StripeElementsOptions["appearance"]>;
}

export function getThemePreset(theme: string | undefined): ThemingPresetProps {
  const isDark = theme !== "light";

  return {
    stripe: {
      theme: isDark ? "night" : "stripe",
      variables: {
        colorPrimary: "#9B352F",
      },
    },
  };
}
