"use client";

import { Loader2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { wakingStore } from "@/lib/api/waking";

/** Friendly notice while the free-tier API cold-starts (requests are being retried). */
export function WakingBanner() {
  const waking = useSyncExternalStore(wakingStore.subscribe, wakingStore.getSnapshot, wakingStore.getServerSnapshot);
  if (!waking) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-3 z-[60] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border bg-card/95 px-4 py-2 text-sm shadow-lg backdrop-blur"
    >
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      <span>Waking up the server… this can take up to a minute on the free tier.</span>
    </div>
  );
}
