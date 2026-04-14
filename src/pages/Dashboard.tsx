import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Package, FileText, DollarSign, Wallet, Users, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { useMemo } from "react";

const Dashboard = () => {
  const products = store.getProducts();
  const sales = store.getSales();
  const purchases = store.getPurchases();
  const customers = store.getCustomers();
  const suppliers = store.getSuppliers();
  const expenses = store.getExpenses();

  const totalIncome = sales.reduce((s, sale) => s + sale.paid, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0) + purchases.reduce((s, p) => s + p.paid, 0);
  const customerDue = customers.reduce((s, c) => s + c.due, 0);
  const supplierDue = suppliers.reduce((s, s2) => s + s2.due, 0);
  const stockValue = products.reduce((s, p) => s + p.costPrice * p.stock, 0);
  const totalProfit = sales.reduce((s, sale) => s + Math.max(0, sale.profit), 0);
  const totalLoss = sales.reduce((s, sale) => s + Math.abs(Math.min(0, sale.profit)), 0);
  const lowStock = products.filter(p => p.stock <= p.alertQty).length;

  const chartData = useMemo(() => {
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

  const stats = [
    { icon: Package, label: "Total Products", value: products.length, color: "#27ae60" },
    { icon: FileText, label: "Total Sales", value: sales.length, color: "#2980b9" },
    { icon: Users, label: "Customers", value: customers.length, color: "#e67e22" },
    { icon: BarChart3, label: "Low Stock", value: lowStock, color: "#e74c3c" },
  ];

  const overview = [
    { icon: DollarSign, label: "Total Income", value: `$ ${totalIncome.toLocaleString()}`, color: "#27ae60" },
    { icon: Wallet, label: "Total Expense", value: `$ ${totalExpense.toLocaleString()}`, color: "#e74c3c" },
    { icon: Users, label: "Customer Due", value: `$ ${customerDue.toLocaleString()}`, color: "#2980b9" },
    { icon: TrendingDown, label: "Supplier Due", value: `$ ${supplierDue.toLocaleString()}`, color: "#8e44ad" },
    { icon: TrendingUp, label: "Total Profit", value: `$ ${totalProfit.toLocaleString()}`, color: "#27ae60" },
    { icon: Package, label: "Stock Value", value: `$ ${stockValue.toLocaleString()}`, color: "#e67e22" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
      </header>

      {/* Chart */}
      <div className="mx-4 bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="font-bold text-sm mb-1">Sales & Purchase Overview</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sales" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="purchase" fill="hsl(0,78%,55%)" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-3.5 shadow-sm border border-border flex items-center gap-3">
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
            <div key={o.label} className="bg-card rounded-xl p-3.5 shadow-sm border border-border flex items-center gap-3">
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
