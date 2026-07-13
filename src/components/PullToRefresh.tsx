import { RefreshCw } from "lucide-react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { forceSyncLiveBusinessData } from "@/lib/live-sync";

/**
 * App-wide pull-to-refresh: wraps the routed screen content once (in
 * ProtectedRoute) so every authenticated screen gets the gesture for free,
 * instead of each page wiring its own refresh logic.
 */
const PullToRefresh = ({ children }: { children: React.ReactNode }) => {
  const { pullDistance, refreshing, threshold } = usePullToRefresh(() =>
    forceSyncLiveBusinessData().catch(() => undefined)
  );

  const visible = pullDistance > 0 || refreshing;
  const progress = Math.min(1, pullDistance / threshold);
  const offset = refreshing ? threshold : pullDistance;

  return (
    <>
      <div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-50 flex justify-center pointer-events-none"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          transform: `translateY(${offset}px)`,
          transition: refreshing || pullDistance === 0 ? "transform 0.25s ease" : "none",
          opacity: visible ? 1 : 0,
        }}
      >
        <div className="mt-2 w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center">
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin text-primary" : "text-primary"}
            style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
          />
        </div>
      </div>
      {children}
    </>
  );
};

export default PullToRefresh;
