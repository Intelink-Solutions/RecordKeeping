import {
  ShoppingCart, Users, ShoppingBag, Package, ListChecks, BarChart3,
  FileText, TrendingUp, Wallet, Receipt, DollarSign, CreditCard,
  UserCheck, Truck, Tags, BookOpen, Landmark, Users2, Bell, UserCircle
} from "lucide-react";
import MenuCard from "@/components/MenuCard";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import logo from "@/assets/logo.png";

const salesMenu = [
  { icon: ShoppingCart, label: "New Sale", path: "/add-sale", color: "#e74c3c" },
  { icon: Receipt, label: "Sales List", path: "/sales", color: "#27ae60" },
  { icon: TrendingUp, label: "Sale Returns", path: "/sale-returns", color: "#e67e22" },
];

const purchaseMenu = [
  { icon: ShoppingBag, label: "New Purchase", path: "/add-purchase", color: "#2980b9" },
  { icon: CreditCard, label: "Purchase List", path: "/purchases", color: "#8e44ad" },
  { icon: ListChecks, label: "Purchase Returns", path: "/purchase-returns", color: "#e67e22" },
];

const inventoryMenu = [
  { icon: Package, label: "Products", path: "/products", color: "#e74c3c" },
  { icon: Tags, label: "Categories", path: "/categories", color: "#27ae60" },
  { icon: BookOpen, label: "Brands", path: "/brands", color: "#2980b9" },
  { icon: BarChart3, label: "Stock List", path: "/stock", color: "#8e44ad" },
];

const peopleMenu = [
  { icon: UserCheck, label: "Customers", path: "/customers", color: "#27ae60" },
  { icon: Truck, label: "Suppliers", path: "/suppliers", color: "#e67e22" },
  { icon: DollarSign, label: "Due List", path: "/due-list", color: "#e74c3c" },
];

const financeMenu = [
  { icon: Landmark, label: "Finance", path: "/finance", color: "#2980b9" },
  { icon: Wallet, label: "Expenses", path: "/expenses", color: "#e74c3c" },
  { icon: DollarSign, label: "Income", path: "/income", color: "#27ae60" },
  { icon: FileText, label: "Reports", path: "/reports", color: "#8e44ad" },
];

const hrmMenu = [
  { icon: Users2, label: "HRM", path: "/hrm", color: "#8e44ad" },
];

const Index = () => {
  const sales = store.getSales();
  const purchases = store.getPurchases();
  const expenses = store.getExpenses();
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalPurchases = purchases.reduce((s, p) => s + p.total, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Nav - White */}
      <div className="bg-white px-5 py-3 shadow-sm flex items-center justify-between">
        <img src={logo} alt="Key Doctors Solutions" className="h-10 object-contain" />
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell className="h-5 w-5 text-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
          </button>
          <button className="p-1 rounded-full hover:bg-muted transition-colors">
            <UserCircle className="h-8 w-8 text-foreground" />
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-primary px-5 pt-5 pb-8 rounded-b-3xl">
        <div className="bg-black dark:bg-background rounded-2xl p-4 border border-white/10 dark:border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-primary font-bold text-base">Today's Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sales", value: `$ ${totalSales.toLocaleString()}` },
              { label: "Purchased", value: `$ ${totalPurchases.toLocaleString()}` },
              { label: "Profit", value: `$ ${totalProfit.toLocaleString()}` },
              { label: "Expense", value: `$ ${totalExpense.toLocaleString()}` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-primary/70 text-xs font-medium">{item.label}</p>
                <p className="text-primary font-bold text-lg">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">
        <Section title="Sales" items={salesMenu} />
        <Section title="Purchase" items={purchaseMenu} />
        <Section title="Inventory" items={inventoryMenu} />
        <Section title="People" items={peopleMenu} />
        <Section title="Finance & Reports" items={financeMenu} />
        <Section title="HRM" items={hrmMenu} />
      </div>

      <BottomNav />
    </div>
  );
};

const Section = ({ title, items }: { title: string; items: { icon: any; label: string; path: string; color: string }[] }) => (
  <div>
    <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <MenuCard key={item.label} {...item} />
      ))}
    </div>
  </div>
);

export default Index;
