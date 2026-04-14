import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Package, FileText, DollarSign, Wallet, Users, BarChart3 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";

const chartData = [
  { name: "01", sales: 0, purchase: 0 },
  { name: "02", sales: 32000, purchase: 1000 },
  { name: "03", sales: 0, purchase: 0 },
  { name: "04", sales: 500, purchase: 0 },
  { name: "05", sales: 7000, purchase: 52000 },
];

const Dashboard = () => {
  const products = store.getProducts();
  const sales = store.getSales();
  const parties = store.getParties();
  const totalIncome = sales.reduce((s, sale) => s + sale.paid, 0);
  const customerDue = parties.reduce((s, p) => s + p.due, 0);
  const stockValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  const stats = [
    { icon: Package, label: "Total Items", value: products.length, color: "#27ae60" },
    { icon: FileText, label: "Total Categories", value: 1, color: "#8e44ad" },
  ];

  const overview = [
    { icon: DollarSign, label: "Total Income", value: `$ ${totalIncome}`, color: "#27ae60" },
    { icon: Wallet, label: "Total Expense", value: "$ 52500", color: "#e74c3c" },
    { icon: Users, label: "Customer Due", value: `$ ${customerDue}`, color: "#2980b9" },
    { icon: BarChart3, label: "Stock Value", value: stockValue.toLocaleString(), color: "#e74c3c" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm">
          <option>Monthly</option>
          <option>Weekly</option>
        </select>
      </header>

      {/* Chart */}
      <div className="mx-4 bg-card rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="font-bold text-sm mb-1">Sales & Purchase Overview</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sales" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="purchase" fill="hsl(0,78%,55%)" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color + "18", color: s.color }}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
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
            <div key={o.label} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: o.color + "18", color: o.color }}>
                <o.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{o.label}</p>
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
