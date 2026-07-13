import { useState, useEffect, useRef } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { store, Branch } from "@/lib/store";
import { useAppContext } from "@/hooks/use-app-context";
import { useStoreRefresh, emitStoreUpdate } from "@/hooks/use-live-data";
import { apiGet, tokenStorage } from "@/lib/api";
import { BRANCH_API_PATHS } from "@/lib/api";
import { forceSyncLiveBusinessData } from "@/lib/live-sync";

function extractBranchList(payload: unknown): Branch[] {
  if (!payload) return [];
  let raw: unknown[] = [];
  if (Array.isArray(payload)) {
    raw = payload;
  } else if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) raw = obj.data;
    else if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) raw = nested.data;
    } else if (Array.isArray(obj.branches)) raw = obj.branches;
  }
  return raw.map((item) => {
    const r = item as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      name: String(r.name ?? r.branch_name ?? ""),
      address: r.address ? String(r.address) : undefined,
      phone: r.phone ? String(r.phone) : undefined,
      email: r.email ? String(r.email) : undefined,
      status: String(r.status ?? "Active").toLowerCase() === "inactive" ? "Inactive" : "Active",
    } as Branch;
  });
}

const BranchSwitcher = () => {
  useStoreRefresh();
  const { isOwner } = useAppContext();
  const branches = store.getBranches().filter((b) => b.status === "Active");
  const [activeBranchId, setActiveBranchId] = useState<string>(
    store.getActiveBranchId() ?? ""
  );
  const [syncing, setSyncing] = useState(false);
  const hasFetched = useRef(false);

  // If localStorage has no branches and we're online, fetch directly
  useEffect(() => {
    if (hasFetched.current || branches.length > 0) return;
    if (!tokenStorage.getReal()) return;
    hasFetched.current = true;

    let cancelled = false;
    (async () => {
      for (const path of BRANCH_API_PATHS) {
        try {
          const data = await apiGet<unknown>(path);
          const fetched = extractBranchList(data);
          if (fetched.length > 0 && !cancelled) {
            store.saveBranches(fetched);
            break;
          }
        } catch { /* try next path */ }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Non-owners: show their assigned branch badge (read-only)
  if (!isOwner) {
    const userBranchId = store.getUserBranchId();
    const userBranch = branches.find((b) => b.id === userBranchId);
    if (!userBranch) return null;
    return (
      <div className="flex items-center gap-1 bg-primary/10 rounded-lg px-2 py-1">
        <GitBranch size={11} className="text-primary shrink-0" />
        <span className="text-[11px] font-semibold text-primary truncate max-w-[80px]">
          {userBranch.name}
        </span>
      </div>
    );
  }

  // Owners: show interactive branch selector
  if (branches.length === 0) return null;

  const activeBranchName = branches.find((b) => b.id === activeBranchId)?.name;

  return (
    <Select
      value={activeBranchId}
      onValueChange={async (v) => {
        const newId = v === "__all__" ? "" : v;
        setActiveBranchId(newId);
        store.setActiveBranchId(newId || null);
        // Immediately signal all listeners so pages re-filter local data
        emitStoreUpdate();
        // Then force a full sync to pull this branch's data from the backend
        setSyncing(true);
        try { await forceSyncLiveBusinessData(); } finally { setSyncing(false); }
      }}
    >
      <SelectTrigger
        className="relative flex items-center justify-center w-9 h-9 rounded-full border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted transition-colors [&>svg:last-child]:hidden"
        aria-label={activeBranchName ? `Branch: ${activeBranchName}` : "All branches"}
        title={activeBranchName ?? "All branches"}
      >
        {syncing ? <Loader2 size={18} className="animate-spin" /> : <GitBranch size={18} />}
        {activeBranchId && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "hsl(var(--primary))", boxShadow: "0 0 0 1.5px hsl(var(--background))" }}
          />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All Branches</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default BranchSwitcher;
