import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { CONFIG } from "@/utils/config";

const SITE = "https://blyss.co.ke";

export const dynamic = "force-dynamic";

const privatePaths = [
  "/dashboard/",
  "/login/",
  "/login",
  "/verify-email/",
  "/verify-email",
  "/cart",
  "/cart/",
  "/wishlist",
  "/wishlist/",
  "/api/",
  "/portal/",
  "/*?currency=",
  "/*?page=",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (CONFIG.IS_SANDBOX) {
    return { rules: { userAgent: "*", disallow: "/*" } };
  }

  const host = (await headers()).get("host")?.split(":")[0].toLowerCase();

  if (host === "buy.blyss.co.ke" || host === "my.blyss.co.ke") {
    return {
      rules: { userAgent: "*", disallow: "/*" },
      host: `https://${host}`,
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "Claude-SearchBot",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
