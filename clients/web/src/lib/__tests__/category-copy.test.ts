import { describe, expect, test } from "vitest";
import {
  getCategoryDescription,
  getCategoryTitle,
} from "../seo/category-copy";

describe("category metadata", () => {
  test("describes live listings without promising formats or payment methods", () => {
    expect(getCategoryTitle("Ebooks")).toBe("Browse Ebooks");

    const description = getCategoryDescription("Ebooks");
    expect(description).toContain("current ebooks listings");
    expect(description).toContain("vary by listing and region");
    expect(description).not.toMatch(/instant download|M-Pesa|Visa|license/i);
  });
});
