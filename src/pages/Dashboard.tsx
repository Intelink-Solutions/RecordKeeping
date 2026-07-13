import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Package, FileText, DollarSign, Wallet, Users, BarChart3, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { apiGetDashboard, apiGetSummary } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { useSecurityPrefs } from "@/hooks/use-security-prefs";
import { maskSensitiveValue } from "@/lib/security";
import { useStoreRefresh } from "@/hooks/use-live-data";

const Dashboard = () => {
  const { toast } = useToast();
  const security = useSecurityPrefs();
  useStoreRefresh();
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSummary, setLiveSummary] = useState<{ sales: number; income: number; expense: number; purchase: number } | null>(null);
  const [liveDashboard, setLiveDashboard] = useState<{
    total_items: number;
    total_due: number;
    total_profit: number;
    total_loss: number;
    stock_value: number;
    sales: Array<{ date: string; amount: number }>;
    purchases: Array<{ date: string; amount: number }>;
  } | null>(null);

  const products = store.getProducts();
  const sales = store.getSales();
  const purchases = store.getPurchases();
  const customers = store.getCustomers();
  const suppliers = store.getSuppliers();
  const expenses = store.getExpenses();

  useEffect(() => {
    let mounted = true;

    const loadLiveDashboard = async () => {
      const isOnline = store.getBusinessProfile().isOnline;
      if (!isOnline) return;

      setLiveLoading(true);
      try {
        const [summary, dashboard] = await Promise.all([
          apiGetSummary(),
          apiGetDashboard("current_month"),
        ]);

        if (!mounted) return;
        setLiveSummary(summary);
        setLiveDashboard(dashboard);
      } catch (error) {
        if (!mounted) return;
        setLiveSummary(null);
        setLiveDashboard(null);

        const msg = error instanceof Error ? error.message : "Live dashboard unavailable.";
        toast({
          title: "Live Dashboard Fallback",
          description: `${msg} Showing local data.`,
          variant: "destructive",
        });
      } finally {
        if (mounted) setLiveLoading(false);
      }
    };

    loadLiveDashboard();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const totalIncome = sales.reduce((s, sale) => s + sale.paid, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0) + purchases.reduce((s, p) => s + p.paid, 0);
  const customerDue = customers.reduce((s, c) => s + c.due, 0);
  const supplierDue = suppliers.reduce((s, s2) => s + s2.due, 0);
  const stockValue = products.reduce((s, p) => s + p.costPrice * p.stock, 0);
  const totalProfit = sales.reduce((s, sale) => s + Math.max(0, sale.profit), 0);
  const totalLoss = sales.reduce((s, sale) => s + Math.abs(Math.min(0, sale.profit)), 0);
  const lowStock = products.filter(p => p.stock <= p.alertQty).length;

  const localChartData = useMemo(() => {
    const days: Record<string, { sales: number; purchase: number }> = {};
    sales.forEach(s => {
      const d = s.date.slice(-2);
      if (!days[d]) days[d] = { sales: 0, purchase: 0 };
      days[d].sales += s.total;
    });
    purchases.forEach(p => {
      const d = p.date.slice(-2);
      if (!days[d]) days[d] = { sales: 0, purchase: 0 };
      days[d].purchase += p.total;
    });
    return Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).map(([name, data]) => ({ name, ...data }));
  }, [sales, purchases]);

  const liveChartData = useMemo(() => {
    if (!liveDashboard) return [];

    return liveDashboard.sales.map((row, idx) => ({
      name: row.date,
      sales: row.amount,
      purchase: liveDashboard.purchases[idx]?.amount ?? 0,
    }));
  }, [liveDashboard]);

  const chartData = liveChartData.length ? liveChartData : localChartData;

  const isOnline = store.getBusinessProfile().isOnline;
  const totalProducts = liveDashboard?.total_items ?? products.length;
  const totalSalesCount = liveSummary ? Math.round(liveSummary.sales) : sales.length;
  const customerDueValue = liveDashboard?.total_due ?? customerDue;
  const totalIncomeValue = liveSummary?.income ?? totalIncome;
  const totalExpenseValue = liveSummary?.expense ?? totalExpense;
  const totalProfitValue = liveDashboard?.total_profit ?? totalProfit;
  const totalLossValue = liveDashboard?.total_loss ?? totalLoss;
  const stockValueValue = liveDashboard?.stock_value ?? stockValue;

  const stats = [
    { icon: Package, label: "Total Products", value: totalProducts, color: "#27ae60" },
    { icon: FileText, label: "Total Sales", value: totalSalesCount, color: "#2980b9" },
    { icon: Users, label: "Customers", value: customers.length, color: "#e67e22" },
    { icon: BarChart3, label: "Low Stock", value: lowStock, color: "#e74c3c" },
  ];

  const overview = [
    { icon: DollarSign, label: "Total Income", value: maskSensitiveValue(formatCurrency(totalIncomeValue), security.hideAmounts), color: "#27ae60" },
    { icon: Wallet, label: "Total Expense", value: maskSensitiveValue(formatCurrency(totalExpenseValue), security.hideAmounts), color: "#e74c3c" },
    { icon: Users, label: "Customer Debt", value: maskSensitiveValue(formatCurrency(customerDueValue), security.hideAmounts), color: "#2980b9" },
    { icon: TrendingDown, label: "Supplier Debt", value: maskSensitiveValue(formatCurrency(supplierDue), security.hideAmounts), color: "#8e44ad" },
    { icon: TrendingUp, label: "Total Profit", value: maskSensitiveValue(formatCurrency(totalProfitValue), security.hideAmounts), color: "#27ae60" },
    { icon: Package, label: "Stock Value", value: maskSensitiveValue(formatCurrency(stockValueValue), security.hideAmounts), color: "#e67e22" },
    { icon: TrendingDown, label: "Total Loss", value: maskSensitiveValue(formatCurrency(totalLossValue), security.hideAmounts), color: "#e74c3c" },
  ];

  return (
    <div className="min-h-screen bg-background pb-nav">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4 flex items-center gap-3 safe-top">
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shrink-0">
          <BarChart3 size={20} className="text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight truncate">Dashboard</h1>
          <p className="text-xs text-muted-foreground truncate">Business performance at a glance</p>
        </div>
        {liveLoading && <Loader2 size={16} className="text-primary animate-spin shrink-0 ml-auto" />}
      </header>

      {/* Chart */}
      <div className="mx-4 mt-4 bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="font-bold text-sm mb-1">Sales & Purchase Overview</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="purchase" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-3.5 shadow-sm border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: s.color + "18", color: s.color }}>
              <s.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
              <p className="font-bold text-lg">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Overview */}
      <div className="px-4 mt-5">
        <h3 className="font-bold text-base mb-3">Quick Overview</h3>
        <div className="grid grid-cols-2 gap-3">
          {overview.map((o) => (
            <div key={o.label} className="bg-card rounded-2xl p-3.5 shadow-sm border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: o.color + "18", color: o.color }}>
                <o.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{o.label}</p>
                <p className="font-bold text-sm">{o.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
