import { describe, expect, it } from "vitest";
import { getThemePreset } from "./theming";

describe("getThemePreset", () => {
  it("uses the dark Stripe appearance for dark mode", () => {
    expect(getThemePreset("dark").stripe).toMatchObject({
      theme: "night",
      variables: { colorPrimary: "#9B352F" },
    });
  });

  it("defaults to the dark Stripe appearance", () => {
    expect(getThemePreset(undefined).stripe).toMatchObject({
      theme: "night",
      variables: { colorPrimary: "#9B352F" },
    });
  });

  it("uses the light Stripe appearance when selected", () => {
    expect(getThemePreset("light").stripe).toMatchObject({
      theme: "stripe",
      variables: { colorPrimary: "#9B352F" },
    });
  });
});
