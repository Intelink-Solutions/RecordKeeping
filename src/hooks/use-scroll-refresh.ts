import { useEffect, useRef, useCallback } from "react";

/**
 * Triggers `onRefresh` when the user has scrolled to within `threshold`px of
 * the bottom of the page.  Debounces so it fires at most once per `cooldownMs`.
 */
export function useScrollRefresh(
  onRefresh: () => void,
  { threshold = 120, cooldownMs = 10_000 }: { threshold?: number; cooldownMs?: number } = {}
) {
  const lastFired = useRef(0);
  const stable = useRef(onRefresh);
  stable.current = onRefresh;

  const check = useCallback(() => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    if (total - scrolled > threshold) return;
    const now = Date.now();
    if (now - lastFired.current < cooldownMs) return;
    lastFired.current = now;
    stable.current();
  }, [threshold, cooldownMs]);

  useEffect(() => {
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [check]);
}
