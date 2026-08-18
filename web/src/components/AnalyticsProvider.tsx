"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { analytics } from "@/lib/analytics";
import { useStore } from "@/lib/store";

export function AnalyticsProvider() {
  const pathname    = usePathname();
  const initialized = useRef(false);
  const overallScore = useStore((s) => s.overallScore);

  // Init once on mount — checks if user is returning via existing score in store
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    analytics.init(overallScore !== null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track every page navigation
  useEffect(() => {
    analytics.track("page_viewed", { page: pathname });
  }, [pathname]);

  return null;
}
