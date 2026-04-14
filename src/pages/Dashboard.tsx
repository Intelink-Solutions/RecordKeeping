import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Package, FileText, DollarSign, Wallet, Users, TrendingUp, TrendingDown, ShoppingCart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";

const COLORS = ["hsl(0,78%,55%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(217,91%,60%)"];

const Dashboard = () => {
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");

  const products = store.getProducts();
  const sales = store.getSales();
  const purchases = store.getPurchases();
  const customers = store.getCustomers();
  const suppliers = store.getSuppliers();
  const expenses = store.getExpenses();
  const incomes = store.getIncomes();

  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalPurchases = purchases.reduce((s, p) => s + p.total, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0) + totalSales;
  const customerDue = customers.reduce((s, c) => s + c.due, 0);
  const supplierDue = suppliers.reduce((s, su) => s + su.due, 0);
  const stockValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStockCount = products.filter(p => p.stock <= p.alertQty).length;

  const chartData = useMemo(() => {
    const grouped: Record<string, { sales: number; purchase: number }> = {};
    sales.forEach(s => {
      const d = s.date.slice(8, 10);
      if (!grouped[d]) grouped[d] = { sales: 0, purchase: 0 };
      grouped[d].sales += s.total;
    });
    purchases.forEach(p => {
      const d = p.date.slice(8, 10);
      if (!grouped[d]) grouped[d] = { sales: 0, purchase: 0 };
      grouped[d].purchase += p.total;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, data]) => ({ name, ...data }));
  }, [sales, purchases]);

  const pieData = [
    { name: "Sales", value: totalSales },
    { name: "Purchases", value: totalPurchases },
    { name: "Expenses", value: totalExpense },
    { name: "Income", value: totalIncome - totalSales },
  ].filter(d => d.value > 0);

  const summaryCards = [
    { icon: DollarSign, label: "Total Sales", value: totalSales, color: "hsl(var(--success))", trend: "+12%", up: true },
    { icon: ShoppingCart, label: "Total Purchase", value: totalPurchases, color: "hsl(var(--info))", trend: "+8%", up: true },
    { icon: TrendingUp, label: "Net Profit", value: totalProfit, color: "hsl(var(--success))", trend: "+5%", up: true },
    { icon: TrendingDown, label: "Total Expense", value: totalExpense, color: "hsl(var(--destructive))", trend: "-3%", up: false },
  ];

  const overviewCards = [
    { icon: Users, label: "Customer Due", value: customerDue, color: "hsl(var(--warning))" },
    { icon: Package, label: "Supplier Due", value: supplierDue, color: "hsl(var(--info))" },
    { icon: FileText, label: "Stock Value", value: stockValue, color: "hsl(var(--primary))" },
    { icon: Wallet, label: "Low Stock", value: lowStockCount, color: "hsl(var(--destructive))", isCount: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Business overview at a glance</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as "weekly" | "monthly")}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
      </header>

      {/* Summary Cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-card rounded-2xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + "18", color: card.color }}>
                <card.icon size={18} />
              </div>
              <span className={`text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${card.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {card.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {card.trend}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">{card.label}</p>
            <p className="font-bold text-lg">$ {card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mx-4 bg-card rounded-2xl p-4 shadow-sm border border-border mb-4">
        <h3 className="font-bold text-sm mb-1">Sales & Purchase Overview</h3>
        <p className="text-[11px] text-muted-foreground mb-3">Daily comparison chart</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sales" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={14} name="Sales" />
              <Bar dataKey="purchase" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={14} name="Purchase" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Pie */}
      {pieData.length > 0 && (
        <div className="mx-4 bg-card rounded-2xl p-4 shadow-sm border border-border mb-4">
          <h3 className="font-bold text-sm mb-3">Revenue Breakdown</h3>
          <div className="flex items-center">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 ml-4 space-y-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                  <span className="text-xs font-bold">$ {d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Overview */}
      <div className="px-4">
        <h3 className="font-bold text-base mb-3">Quick Overview</h3>
        <div className="grid grid-cols-2 gap-3">
          {overviewCards.map((o) => (
            <div key={o.label} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: o.color + "18", color: o.color }}>
                <o.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{o.label}</p>
                <p className="font-bold text-sm">{o.isCount ? o.value : `$ ${o.value.toLocaleString()}`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="px-4 mt-5 mb-4">
        <h3 className="font-bold text-base mb-3">Recent Sales</h3>
        <div className="space-y-2">
          {sales.slice(0, 4).map((s) => (
            <div key={s.id} className="bg-card rounded-xl px-4 py-3 shadow-sm border border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {s.customerName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{s.customerName}</p>
                <p className="text-[11px] text-muted-foreground">{s.invoiceNo} • {s.date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">$ {s.total.toLocaleString()}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.status === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {s.status}
                </span>
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
