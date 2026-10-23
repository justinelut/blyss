import { Toaster } from "@/components/Toast/Toaster";
import { BlyssNuqsProvider } from "@/providers/nuqs";
import { Metadata } from "next";
import { PropsWithChildren, Suspense } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Layout({ children }: PropsWithChildren) {
  return (
    <BlyssNuqsProvider>
      <div className="flex h-full flex-col md:h-screen">
        {children}
        <Suspense>
          <Toaster />
        </Suspense>
      </div>
    </BlyssNuqsProvider>
  );
}
