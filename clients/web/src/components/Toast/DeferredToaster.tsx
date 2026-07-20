"use client";
"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LazyToaster = dynamic(() =>
  import("@/components/Toast/Toaster").then((module) => module.Toaster),
);

const TOAST_REQUEST_EVENT = "blyss:toast-request";

/** Keep Radix Toast out of passive marketplace loads without dropping events. */
export function DeferredToaster() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const activate = () => setActive(true);

    if (
      new URLSearchParams(window.location.search).get("toast") === "true" ||
      document.documentElement.dataset.blyssToastRequested === "true"
    ) {
      activate();
    }

    window.addEventListener(TOAST_REQUEST_EVENT, activate);

    return () => {
      window.removeEventListener(TOAST_REQUEST_EVENT, activate);
    };
  }, []);

  return active ? <LazyToaster /> : null;
}
