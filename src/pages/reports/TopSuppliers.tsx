import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { Search, MessageCircle, Mail, Truck, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

type Period = "year" | "month" | "week";
type Limit = 5 | 10;

interface SupplierRow {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  orders: number;
  totalQty: number;
  totalAmount: number;
}

function getPeriodStart(period: Period): string {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  }
  if (period === "month") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return `${now.getFullYear()}-01-01`;
}

const PERIOD_LABELS: Record<Period, string> = { year: "This Year", month: "This Month", week: "This Week" };
const RANK_COLORS = ["#f59e0b", "#94a3b8", "#cd7f32", "#6366f1", "#22c55e", "#e74c3c", "#2980b9", "#8e44ad", "#e67e22", "#27ae60"];
const RANK_ICONS = ["🥇", "🥈", "🥉"];

const TopSuppliers = () => {
  const purchases = store.getPurchases();
  const suppliers = store.getSuppliers();
  const [period, setPeriod] = useState<Period>("month");
  const [limit, setLimit] = useState<Limit>(10);
  const [search, setSearch] = useState("");

  const periodStart = getPeriodStart(period);

  const ranked: SupplierRow[] = useMemo(() => {
    const map: Record<string, SupplierRow> = {};
    purchases.forEach((p) => {
      if (!p.supplierId) return;
      if (p.date < periodStart) return;
      if (!map[p.supplierId]) {
        const sup = suppliers.find((s) => s.id === p.supplierId);
        map[p.supplierId] = {
          id: p.supplierId,
          name: p.supplierName,
          phone: sup?.phone,
          email: sup?.email,
          orders: 0,
          totalQty: 0,
          totalAmount: 0,
        };
      }
      map[p.supplierId].orders++;
      map[p.supplierId].totalQty += p.items.reduce((sum, i) => sum + i.quantity, 0);
      map[p.supplierId].totalAmount += p.total;
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, limit);
  }, [purchases, suppliers, periodStart, limit]);

  const displayed = search
    ? ranked.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : ranked;

  const totalSpend = ranked.reduce((s, r) => s + r.totalAmount, 0);
  const totalOrders = ranked.reduce((s, r) => s + r.orders, 0);

  const openWhatsApp = (phone?: string, name?: string) => {
    const msg = encodeURIComponent(
      `Hello ${name ?? "Valued Supplier"},\n\nThank you for being one of our top suppliers! We truly appreciate your partnership and consistent supply.\n\nWe look forward to continuing our business relationship! 🙏\n\n— ${store.getBusinessProfile().companyName}`
    );
    const raw = phone?.replace(/[^\d+]/g, "") ?? "";
    window.open(raw ? `https://wa.me/${raw}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const openEmail = (email?: string, name?: string) => {
    const subject = encodeURIComponent("Thank You for Your Partnership!");
    const body = encodeURIComponent(
      `Hello ${name ?? "Valued Supplier"},\n\nThank you for being one of our top suppliers! We truly appreciate your partnership and consistent supply.\n\nWe look forward to continuing our business relationship!\n\nBest regards,\n${store.getBusinessProfile().companyName}`
    );
    window.open(`mailto:${email ?? ""}?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Top Suppliers" />

      <div className="px-4 py-4 space-y-4">
        {/* Period tabs */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {(["year", "month", "week"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                period === p ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Limit toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Show:</span>
          {([5, 10] as Limit[]).map((l) => (
            <button
              key={l}
              onClick={() => setLimit(l)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                limit === l
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              Top {l}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3.5 border border-border text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-1">Suppliers</p>
            <p className="text-xl font-bold text-primary">{ranked.length}</p>
          </div>
          <div className="bg-card rounded-xl p-3.5 border border-border text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-1">Orders</p>
            <p className="text-xl font-bold text-info">{totalOrders}</p>
          </div>
          <div className="bg-card rounded-xl p-3.5 border border-border text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-1">Total Spend</p>
            <p className="text-sm font-bold text-warning">{formatCurrency(totalSpend)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by supplier name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Podium for top 3 */}
        {!search && displayed.length >= 3 && (
          <div className="flex items-end justify-center gap-3 py-4">
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-2xl">🥈</span>
              <div className="bg-slate-200 dark:bg-slate-700 w-full rounded-t-xl flex items-center justify-center h-14">
                <p className="text-xs font-bold text-center px-1 leading-tight">{displayed[1].name.split(" ")[0]}</p>
              </div>
              <p className="text-xs font-semibold">{formatCurrency(displayed[1].totalAmount)}</p>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-3xl">🥇</span>
              <div className="bg-amber-400 dark:bg-amber-500 w-full rounded-t-xl flex items-center justify-center h-20">
                <p className="text-xs font-bold text-white text-center px-1 leading-tight">{displayed[0].name.split(" ")[0]}</p>
              </div>
              <p className="text-xs font-semibold">{formatCurrency(displayed[0].totalAmount)}</p>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-2xl">🥉</span>
              <div className="bg-orange-300 dark:bg-orange-700 w-full rounded-t-xl flex items-center justify-center h-10">
                <p className="text-xs font-bold text-center px-1 leading-tight">{displayed[2].name.split(" ")[0]}</p>
              </div>
              <p className="text-xs font-semibold">{formatCurrency(displayed[2].totalAmount)}</p>
            </div>
          </div>
        )}

        {/* Supplier list */}
        <div className="space-y-3">
          {displayed.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No supplier data for {PERIOD_LABELS[period].toLowerCase()}</p>
            </div>
          ) : (
            displayed.map((supplier, idx) => {
              const rankColor = RANK_COLORS[idx] ?? "#6b7280";
              const share = totalSpend > 0 ? (supplier.totalAmount / totalSpend) * 100 : 0;
              return (
                <div key={supplier.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="h-1" style={{ background: rankColor, width: "100%" }} />
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white text-sm shrink-0 mt-0.5"
                        style={{ background: rankColor }}
                      >
                        {idx < 3 ? RANK_ICONS[idx] : `#${idx + 1}`}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm truncate">{supplier.name}</p>
                            {supplier.phone && (
                              <p className="text-[11px] text-muted-foreground">{supplier.phone}</p>
                            )}
                          </div>
                          <p className="font-extrabold text-sm shrink-0" style={{ color: rankColor }}>
                            {formatCurrency(supplier.totalAmount)}
                          </p>
                        </div>

                        <div className="flex gap-4 mt-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Orders</p>
                            <p className="text-xs font-bold">{supplier.orders}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Items Supplied</p>
                            <p className="text-xs font-bold">{supplier.totalQty}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Spend Share</p>
                            <p className="text-xs font-bold">{share.toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, background: rankColor }} />
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => openWhatsApp(supplier.phone, supplier.name)}
                            className="flex items-center gap-1.5 bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </button>
                          <button
                            onClick={() => openEmail(supplier.email, supplier.name)}
                            disabled={!supplier.email}
                            className="flex items-center gap-1.5 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
                          >
                            <Mail size={12} /> Email
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {displayed.length > 0 && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <TrendingUp size={13} />
            <span>Ranked by total spend · {PERIOD_LABELS[period]}</span>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default TopSuppliers;
