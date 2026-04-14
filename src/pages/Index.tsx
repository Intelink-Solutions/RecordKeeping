import {
  ShoppingCart, Users, ShoppingBag, Package, ListChecks, BarChart3,
  FileText, TrendingUp, Wallet, Receipt, DollarSign, CreditCard
} from "lucide-react";
import MenuCard from "@/components/MenuCard";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";

const menuItems = [
  { icon: ShoppingCart, label: "Sale", path: "/add-sale", color: "#e74c3c" },
  { icon: Users, label: "Parties", path: "/parties", color: "#e67e22" },
  { icon: ShoppingBag, label: "Purchase", path: "/purchases", color: "#27ae60" },
  { icon: Package, label: "Product", path: "/products", color: "#e74c3c" },
  { icon: ListChecks, label: "Due List", path: "/due-list", color: "#2980b9" },
  { icon: BarChart3, label: "Stock List", path: "/products", color: "#e74c3c" },
  { icon: FileText, label: "Reports", path: "/reports", color: "#e74c3c" },
  { icon: Receipt, label: "Sales List", path: "/sales", color: "#27ae60" },
  { icon: CreditCard, label: "Purchase List", path: "/purchases", color: "#8e44ad" },
  { icon: TrendingUp, label: "Loss/Profit", path: "/loss-profit", color: "#2980b9" },
  { icon: DollarSign, label: "Income", path: "/reports", color: "#27ae60" },
  { icon: Wallet, label: "Expense", path: "/reports", color: "#e74c3c" },
];

const Index = () => {
  const sales = store.getSales();
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
            <Package size={20} className="text-primary-foreground" />
          </div>
          <span className="text-primary-foreground text-lg font-bold">ACNOO</span>
        </div>

        {/* Summary Card */}
        <div className="bg-primary-foreground/15 backdrop-blur rounded-2xl p-4 border border-primary-foreground/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-primary-foreground font-bold text-base">Today's Summary</h2>
            <button className="text-primary-foreground text-sm font-semibold">Sell All →</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sales", value: `$ ${totalSales}` },
              { label: "Purchased", value: "$ 0" },
              { label: "Loss/Profit", value: `$ ${totalProfit}` },
              { label: "Expense", value: "$ 0" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-primary-foreground/70 text-xs font-medium">{item.label}</p>
                <p className="text-primary-foreground font-bold text-lg">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription Banner */}
      <div className="px-4 -mt-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
            <span className="text-primary text-lg">❤️</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Standard Package <span className="text-muted-foreground font-normal">27 Days Left</span></p>
            <p className="text-xs text-muted-foreground">Update your subscription</p>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {menuItems.map((item) => (
          <MenuCard key={item.label} {...item} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
