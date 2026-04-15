import { useEffect, useState } from "react";
import { CloudOff, Cloud, WifiOff, Loader2 } from "lucide-react";
import { store } from "@/lib/store";

const SYNC_STATUS_KEY = "pos_live_sync_status";

type SyncState = "syncing" | "live" | "fallback" | "offline";

function readSyncState(): SyncState {
  const isOnlineMode = store.getBusinessProfile().isOnline;
  if (!isOnlineMode) return "offline";

  const raw = localStorage.getItem(SYNC_STATUS_KEY);
  if (raw === "syncing" || raw === "live" || raw === "fallback") {
    return raw;
  }

  return "live";
}

const styles: Record<SyncState, string> = {
  syncing: "bg-info/15 text-info border-info/20",
  live: "bg-success/15 text-success border-success/20",
  fallback: "bg-warning/15 text-warning border-warning/20",
  offline: "bg-muted text-muted-foreground border-border",
};

const labels: Record<SyncState, string> = {
  syncing: "Syncing",
  live: "Live",
  fallback: "Local Fallback",
  offline: "Offline",
};

const Icon = ({ state }: { state: SyncState }) => {
  if (state === "syncing") return <Loader2 size={12} className="animate-spin" />;
  if (state === "live") return <Cloud size={12} />;
  if (state === "fallback") return <CloudOff size={12} />;
  return <WifiOff size={12} />;
};

const SyncStatusBadge = () => {
  const [state, setState] = useState<SyncState>(readSyncState());

  useEffect(() => {
    const sync = () => setState(readSyncState());
    const timer = setInterval(sync, 1200);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border ${styles[state]}`}>
      <Icon state={state} />
      {labels[state]}
    </span>
  );
};

export default SyncStatusBadge;
