const SYNC_STATUS_KEY = "pos_live_sync_status";

export type SyncStatus = "syncing" | "live" | "fallback" | "offline";

export function setSyncStatus(status: SyncStatus): void {
  localStorage.setItem(SYNC_STATUS_KEY, status);
}

export function getSyncStatus(): SyncStatus {
  const raw = localStorage.getItem(SYNC_STATUS_KEY);
  if (raw === "syncing" || raw === "live" || raw === "fallback" || raw === "offline") {
    return raw;
  }
  return "fallback";
}
