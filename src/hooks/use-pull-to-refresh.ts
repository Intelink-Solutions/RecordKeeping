import { useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 70; // damped px needed before a release triggers a refresh
const MAX_PULL = 110; // visual cap so the indicator doesn't drift forever
const DAMPING = 0.5;
const MOVE_TOLERANCE = 8; // px of movement before deciding vertical-pull vs. horizontal-swipe/scroll

/**
 * Detects a downward drag starting from the very top of the page and calls
 * `onRefresh` once the user pulls past the threshold and releases — the
 * standard mobile "pull to refresh" gesture.
 *
 * Listens on `window` (not a scroll container ref) because every screen in
 * this app scrolls the window itself (see use-scroll-refresh.ts), so a
 * single instance mounted once covers every screen with no per-page wiring.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const refreshingRef = useRef(false);
  refreshingRef.current = refreshing;

  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let phase: "idle" | "pulling" | "rejected" = "idle";
    let distance = 0;

    const setPull = (value: number) => {
      distance = value;
      setPullDistance(value);
    };

    const reset = () => {
      start = null;
      phase = "idle";
      setPull(0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1 || window.scrollY > 0) {
        start = null;
        phase = "idle";
        return;
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      phase = "idle";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!start || refreshingRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (phase === "idle") {
        if (Math.abs(dx) < MOVE_TOLERANCE && Math.abs(dy) < MOVE_TOLERANCE) return;
        phase = dy > 0 && Math.abs(dy) > Math.abs(dx) ? "pulling" : "rejected";
      }
      if (phase !== "pulling") return;

      // The page may have scrolled away from the top mid-gesture (e.g. a
      // sticky header reflow) — bail out rather than fight native scroll.
      if (window.scrollY > 0) {
        reset();
        return;
      }

      setPull(Math.min(MAX_PULL, dy * DAMPING));
      // Block the native overscroll/bounce while we're driving our own indicator.
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (phase === "pulling" && distance >= PULL_THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(PULL_THRESHOLD);
        Promise.resolve(onRefreshRef.current())
          .catch(() => undefined)
          .finally(() => {
            refreshingRef.current = false;
            setRefreshing(false);
            reset();
          });
      } else {
        reset();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, []);

  return { pullDistance, refreshing, threshold: PULL_THRESHOLD };
}
