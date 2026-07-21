import { readFileSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { LegalPageShell } from "./_legal/LegalPageShell";

const SITE = "https://blyss.co.ke";

const descriptions: Record<string, string> = {
  "about.md":
    "How Blyss helps independent creators sell digital products and subscriptions, accept M-Pesa or card payments, and deliver purchases online.",
  "help.md":
    "Help with buying, downloading, selling, payments, creator payouts, accounts, and refunds on Blyss.",
  "refunds.md":
    "Blyss refund rules for digital products, duplicate charges, missing files, and purchases that do not match their listing.",
  "terms.md":
    "Terms that apply when buyers and creators use the Blyss digital products marketplace.",
  "privacy.md":
    "How Blyss collects, uses, stores, and protects personal data for buyers, creators, and visitors.",
  "acceptable-use.md":
    "Rules for products, listings, accounts, and conduct on the Blyss marketplace.",
};

function getContent(file: string): string {
  return readFileSync(join(process.cwd(), "src/content/legal", file), "utf8");
}

export function makeLegalPage(file: string, title: string) {
  const slug = file.replace(/\.md$/, "");
  const url = `${SITE}/${slug}`;
  const description = descriptions[file];
  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Blyss", type: "website" },
    robots: { index: true, follow: true },
  };

  function Page() {
    const content = getContent(file);
    return <LegalPageShell title={title} content={content} />;
  }

  return { metadata, Page };
}
