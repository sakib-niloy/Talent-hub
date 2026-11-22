"use client";

import { useEffect, useRef } from "react";

/** Calls `onEnter` when the returned ref's element scrolls into view (infinite scroll sentinel). */
export function useOnInView<T extends Element>(onEnter: () => void, enabled = true, rootMargin = "600px") {
  const ref = useRef<T | null>(null);
  const cb = useRef(onEnter);

  useEffect(() => {
    cb.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) cb.current();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, rootMargin]);

  return ref;
}
