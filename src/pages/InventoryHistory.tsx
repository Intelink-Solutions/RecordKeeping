import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Search, Package, Tag, Book, Ruler, Trash2, Edit2, Plus, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";
import { useStoreRefresh } from "@/hooks/use-live-data";

type ActionType = "created" | "updated" | "deleted" | "viewed";

interface HistoryEntry {
  id: string;
  entityType: "Product" | "Category" | "Brand" | "Unit";
  entityName: string;
  action: ActionType;
  detail: string;
  user: string;
  timestamp: string; // ISO string
}

// Build a synthetic history from the current store state.
// In a full backend integration this would be a real audit-log API call.
function buildHistory(): HistoryEntry[] {
  const products = store.getProducts();
  const categories = store.getCategories();
  const brands = store.getBrands();
  const profile = store.getBusinessProfile();
  const user = profile.companyName ? `Admin (${profile.companyName})` : "Admin";

  const entries: HistoryEntry[] = [];

  // Products
  products.forEach((p) => {
    entries.push({
      id: `p-${p.id}`,
      entityType: "Product",
      entityName: p.name,
      action: "created",
      detail: `Code: ${p.code} · Price: ${formatCurrency(p.price)} · Stock: ${p.stock}`,
      user,
      timestamp: new Date().toISOString(), // real integration: use p.created_at
    });
    if (p.stock <= p.alertQty && p.alertQty > 0) {
      entries.push({
        id: `p-low-${p.id}`,
        entityType: "Product",
        entityName: p.name,
        action: "updated",
        detail: `Low stock alert — only ${p.stock} units remaining (alert threshold: ${p.alertQty})`,
        user: "System",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Categories
  categories.forEach((c) => {
    entries.push({
      id: `c-${c.id}`,
      entityType: "Category",
      entityName: c.name,
      action: "created",
      detail: `Category added`,
      user,
      timestamp: new Date().toISOString(),
    });
  });

  // Brands
  brands.forEach((b) => {
    entries.push({
      id: `b-${b.id}`,
      entityType: "Brand",
      entityName: b.name,
      action: "created",
      detail: `Brand added`,
      user,
      timestamp: new Date().toISOString(),
    });
  });

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

const ACTION_CONFIG: Record<ActionType, { label: string; color: string; icon: React.ReactNode }> = {
  created: { label: "Created", color: "#22c55e", icon: <Plus size={11} /> },
  updated: { label: "Updated", color: "#f59e0b", icon: <Edit2 size={11} /> },
  deleted: { label: "Deleted", color: "#ef4444", icon: <Trash2 size={11} /> },
  viewed:  { label: "Viewed",  color: "#6366f1", icon: <Eye size={11} /> },
};

const ENTITY_ICON: Record<HistoryEntry["entityType"], React.ReactNode> = {
  Product:  <Package  size={14} />,
  Category: <Tag      size={14} />,
  Brand:    <Book     size={14} />,
  Unit:     <Ruler    size={14} />,
};

const ENTITY_COLOR: Record<HistoryEntry["entityType"], string> = {
  Product:  "#e74c3c",
  Category: "#27ae60",
  Brand:    "#2980b9",
  Unit:     "#e67e22",
};

const InventoryHistory = () => {
  useStoreRefresh();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | HistoryEntry["entityType"]>("all");
  const [filterAction, setFilterAction] = useState<"all" | ActionType>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const debouncedSearch = useDebounce(search);

  const allHistory = useMemo(() => buildHistory(), []);

  const filtered = useMemo(() => {
    return allHistory.filter((entry) => {
      const matchSearch = !debouncedSearch ||
        entry.entityName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        entry.detail.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        entry.user.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchType = filterType === "all" || entry.entityType === filterType;
      const matchAction = filterAction === "all" || entry.action === filterAction;
      const entryDate = entry.timestamp.split("T")[0];
      const matchFrom = !fromDate || entryDate >= fromDate;
      const matchTo = !toDate || entryDate <= toDate;
      return matchSearch && matchType && matchAction && matchFrom && matchTo;
    });
  }, [allHistory, debouncedSearch, filterType, filterAction, fromDate, toDate]);

  const products = store.getProducts();
  const lowStockCount = products.filter((p) => p.stock <= p.alertQty && p.alertQty > 0).length;

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Inventory History" />

      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 border border-border text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground">Products</p>
            <p className="text-xl font-bold text-primary">{products.length}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground">Categories</p>
            <p className="text-xl font-bold text-success">{store.getCategories().length}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground">Low Stock</p>
            <p className="text-xl font-bold text-destructive">{lowStockCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, detail or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Entity type filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", "Product", "Category", "Brand", "Unit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>

        {/* Action filter */}
        <div className="flex gap-1.5">
          {(["all", "created", "updated", "deleted"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setFilterAction(a)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                filterAction === a
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {a === "all" ? "All" : a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-xs" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-xs" />
        </div>

        {/* History list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-25" />
              <p className="text-sm">No history entries found</p>
            </div>
          ) : (
            filtered.map((entry) => {
              const action = ACTION_CONFIG[entry.action];
              const entityColor = ENTITY_COLOR[entry.entityType];
              const date = new Date(entry.timestamp);
              const dateStr = date.toLocaleDateString();
              const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={entry.id} className="bg-card rounded-xl border border-border shadow-sm flex items-start gap-3 p-3.5">
                  {/* Entity icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: entityColor + "18", color: entityColor }}
                  >
                    {ENTITY_ICON[entry.entityType]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-semibold text-sm truncate">{entry.entityName}</p>
                      {/* Action badge */}
                      <span
                        className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: action.color + "18", color: action.color }}
                      >
                        {action.icon}
                        {action.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{entry.detail}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: entityColor + "12", color: entityColor }}
                      >
                        {entry.entityType}
                      </span>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">{entry.user}</p>
                        <p className="text-[10px] text-muted-foreground">{dateStr} {timeStr}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-2">
          Showing {filtered.length} of {allHistory.length} entries
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default InventoryHistory;
