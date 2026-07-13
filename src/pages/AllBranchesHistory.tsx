import { useState, useCallback, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, paymentStatusLabel } from "@/lib/store";
import { apiGet, NetworkDownError } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Search, TrendingUp, RefreshCw, BarChart3, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BranchSale {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  total: number;
  paid: number;
  due: number;
  profit: number;
  status: string;
  branchId?: string;
  branchName?: string;
}

function unwrap(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  const nested = (obj.data as Record<string, unknown> | undefined)?.data;
  return Array.isArray(nested) ? (nested as Record<string, unknown>[]) : [];
}

function mapSaleRow(row: Record<string, unknown>, branchMap: Map<string, string>): BranchSale {
  const party = row.party as Record<string, unknown> | undefined;
  const branchId = row.branch_id != null ? String(row.branch_id) : undefined;
  return {
    id: String(row.id ?? ""),
    invoiceNo: String(row.invoiceNumber ?? row.invoice_no ?? row.invoiceNo ?? ""),
    date: String(row.saleDate ?? row.sale_date ?? row.created_at ?? "").split(" ")[0],
    customerName: String(party?.name ?? row.customer_name ?? row.customerName ?? "Guest"),
    total: Number(row.totalAmount ?? row.total ?? 0),
    paid: Number(row.paidAmount ?? row.paid ?? 0),
    due: Number(row.dueAmount ?? row.due ?? 0),
    profit: Number(row.profit ?? 0),
    status: String(row.status ?? (Number(row.dueAmount ?? 0) <= 0 ? "Paid" : "Due")),
    branchId,
    branchName: branchId ? branchMap.get(branchId) : undefined,
  };
}

const BRANCH_ALL = "__all__";
const CACHE_KEY = "pos_all_branches_sales_cache";

const AllBranchesHistory = () => {
  const [branches, setBranches] = useState(() => store.getBranches().filter((b) => b.status === "Active"));

  const [sales, setSales] = useState<BranchSale[]>(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]") as BranchSale[]; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [filterBranch, setFilterBranch] = useState(BRANCH_ALL);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setIsOffline(false);

    // Always use the freshest branch list when building the map
    const latestBranches = store.getBranches().filter((b) => b.status === "Active");
    setBranches(latestBranches);
    const branchMap = new Map(latestBranches.map((b) => [b.id, b.name]));

    try {
      // Request all sales without branch filter — pass per_page as param
      const raw = await apiGet<unknown>("/sales", { per_page: "2000" });
      const rows = unwrap(raw);
      const mapped = rows.map((r) => mapSaleRow(r, branchMap));
      setSales(mapped);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(mapped)); } catch { /* ignore */ }
    } catch (err) {
      if (err instanceof NetworkDownError) {
        setIsOffline(true);
        // Use local store as fallback — may have sales from multiple synced branches
        const local = store.getSales();
        const localMapped = local.map((s) => ({
          id: s.id,
          invoiceNo: s.invoiceNo,
          date: s.date,
          customerName: s.customerName,
          total: s.total,
          paid: s.paid,
          due: s.due,
          profit: s.profit,
          status: s.status,
          branchId: s.branchId,
          branchName: s.branchId ? branchMap.get(s.branchId) : undefined,
        }));
        // Merge with any cached data (cached may have more branches than local store)
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]") as BranchSale[];
          const localIds = new Set(localMapped.map((s) => s.id));
          const extra = cached.filter((s) => !localIds.has(s.id));
          setSales([...localMapped, ...extra]);
        } catch {
          setSales(localMapped);
        }
      }
      // Non-network errors: keep whatever was already shown (cache or prior state)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayed = sales
    .filter((s) => filterBranch === BRANCH_ALL || s.branchId === filterBranch)
    .filter((s) => {
      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.branchName ?? "").toLowerCase().includes(q)
      );
    });

  // Per-branch summaries
  const branchSummaries = branches.map((b) => {
    const bSales = sales.filter((s) => s.branchId === b.id);
    return {
      id: b.id,
      name: b.name,
      totalSales: bSales.reduce((sum, s) => sum + s.total, 0),
      totalProfit: bSales.reduce((sum, s) => sum + s.profit, 0),
      count: bSales.length,
    };
  });
  // Include untagged sales in a "Main / Other" bucket
  const untagged = sales.filter((s) => !s.branchId);
  if (untagged.length > 0) {
    branchSummaries.push({
      id: "",
      name: "Main / Other",
      totalSales: untagged.reduce((sum, s) => sum + s.total, 0),
      totalProfit: untagged.reduce((sum, s) => sum + s.profit, 0),
      count: untagged.length,
    });
  }

  const grandTotal = sales.reduce((sum, s) => sum + s.total, 0);
  const grandProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  const statusColor = (status: string) => {
    if (status === "Paid") return "bg-green-100 text-green-700";
    if (status === "Due") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader
        title="All Branches History"
        rightAction={
          <button
            onClick={fetchAll}
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{ color: "rgba(255,255,255,0.7)" }}
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />

      {isOffline && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning rounded-xl px-3 py-2 text-xs">
          <WifiOff size={13} />
          <span>Offline — showing cached data. <button className="underline font-semibold" onClick={fetchAll}>Retry</button></span>
        </div>
      )}

      {/* Grand summary */}
      <div className="bg-primary px-4 pt-4 pb-6 rounded-b-2xl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 rounded-xl p-3 text-center">
            <p className="text-primary/80 text-[10px] font-medium uppercase tracking-wide">All Sales</p>
            <p className="text-white font-bold text-base mt-0.5">{formatCurrency(grandTotal)}</p>
            <p className="text-primary/60 text-[10px]">{sales.length} transactions</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3 text-center">
            <p className="text-primary/80 text-[10px] font-medium uppercase tracking-wide">Total Profit</p>
            <p className="text-white font-bold text-base mt-0.5">{formatCurrency(grandProfit)}</p>
            <p className="text-primary/60 text-[10px]">{branches.length} branches</p>
          </div>
        </div>
      </div>

      {/* Per-branch cards */}
      {branchSummaries.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <BarChart3 size={11} className="inline mr-1" />Branch Breakdown
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {branchSummaries.map((b) => (
              <button
                key={b.id}
                onClick={() => setFilterBranch(filterBranch === b.id ? BRANCH_ALL : b.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-all ${
                  filterBranch === b.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <GitBranch size={10} className={filterBranch === b.id ? "text-primary" : "text-muted-foreground"} />
                  <span className={`text-[11px] font-semibold truncate max-w-[80px] ${filterBranch === b.id ? "text-primary" : "text-foreground"}`}>
                    {b.name}
                  </span>
                </div>
                <p className="text-xs font-bold">{formatCurrency(b.totalSales)}</p>
                <p className="text-[10px] text-muted-foreground">{b.count} sales</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 mt-4 flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice, customer, branch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="h-9 w-auto min-w-[120px] text-xs">
            <GitBranch size={11} className="mr-1 shrink-0" />
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BRANCH_ALL}>All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sales list */}
      <div className="px-4 mt-4 space-y-2">
        {loading ? (
          <div className="text-center py-14 text-muted-foreground text-sm">Loading all branches data…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <TrendingUp size={44} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">No sales found</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchAll}>
              <RefreshCw size={13} className="mr-1" /> Refresh
            </Button>
          </div>
        ) : (
          displayed.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{s.invoiceNo || `Sale #${s.id}`}</p>
                    {s.branchName && (
                      <span className="flex items-center gap-0.5 bg-primary/10 rounded-full px-1.5 py-0.5">
                        <GitBranch size={9} className="text-primary" />
                        <span className="text-[10px] font-semibold text-primary">{s.branchName}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.customerName}</p>
                  <p className="text-[11px] text-muted-foreground">{s.date}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-sm">{formatCurrency(s.total)}</p>
                  {s.due > 0 && (
                    <p className="text-[11px] text-destructive">Debt {formatCurrency(s.due)}</p>
                  )}
                  <Badge className={`text-[10px] mt-0.5 ${statusColor(s.status)}`} variant="outline">
                    {paymentStatusLabel(s.status)}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AllBranchesHistory;
