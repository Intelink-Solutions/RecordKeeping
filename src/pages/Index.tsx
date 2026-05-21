import {
  ShoppingCart, Users, ShoppingBag, Package, ListChecks, BarChart3,
  FileText, TrendingUp, Wallet, Receipt, DollarSign, CreditCard,
  UserCheck, Truck, Tags, BookOpen, Ruler, Landmark, Bell, UserCircle, ShieldCheck,
  Briefcase, Clock, CalendarDays, CalendarOff, ClipboardList, History
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MenuCard from "@/components/MenuCard";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import logo from "@/assets/logo.png";
import { formatCurrency } from "@/lib/currency";
import { useStoreRefresh } from "@/hooks/use-live-data";
import { useSecurityPrefs } from "@/hooks/use-security-prefs";
import { maskSensitiveValue } from "@/lib/security";
import { filterMenuItems } from "@/lib/permissions";
import { useAppContext } from "@/hooks/use-app-context";

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
  { icon: Ruler, label: "Units", path: "/units", color: "#e67e22" },
  { icon: BarChart3, label: "Stock List", path: "/stock", color: "#8e44ad" },
  { icon: History, label: "History", path: "/inventory-history", color: "#6366f1" },
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
  { icon: Briefcase, label: "Departments", path: "/hrm/departments", color: "#2980b9" },
  { icon: UserCheck, label: "Designations", path: "/hrm/designations", color: "#27ae60" },
  { icon: Clock, label: "Shifts", path: "/hrm/shifts", color: "#e67e22" },
  { icon: Users, label: "Employees", path: "/hrm/employees", color: "#8e44ad" },
  { icon: CalendarDays, label: "Leave Types", path: "/hrm/leave-types", color: "#e74c3c" },
  { icon: CalendarOff, label: "Leaves", path: "/hrm/leaves", color: "#2980b9" },
  { icon: CalendarDays, label: "Holidays", path: "/hrm/holidays", color: "#27ae60" },
  { icon: ClipboardList, label: "Attendance", path: "/hrm/attendance", color: "#e67e22" },
  { icon: DollarSign, label: "Payroll", path: "/hrm/payroll", color: "#e74c3c" },
  { icon: BarChart3, label: "Attendance Report", path: "/hrm/attendance-report", color: "#8e44ad" },
  { icon: FileText, label: "Payroll Report", path: "/hrm/payroll-report", color: "#2980b9" },
  { icon: FileText, label: "Leave Report", path: "/hrm/leave-report", color: "#27ae60" },
  { icon: ShieldCheck, label: "User Roles", path: "/user-roles", color: "#2c3e50" },
];

const Index = () => {
  const navigate = useNavigate();
  useStoreRefresh();
  const security = useSecurityPrefs();
  const { role } = useAppContext();
  const sales = store.getSales();
  const purchases = store.getPurchases();
  const expenses = store.getExpenses();
  const unreadNotifications = store.getNotifications().filter((item) => !item.read).length;
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalPurchases = purchases.reduce((s, p) => s + p.total, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  const fSales = filterMenuItems(salesMenu, role);
  const fPurchase = filterMenuItems(purchaseMenu, role);
  const fInventory = filterMenuItems(inventoryMenu, role);
  const fPeople = filterMenuItems(peopleMenu, role);
  const fFinance = filterMenuItems(financeMenu, role);
  const fHrm = filterMenuItems(hrmMenu, role);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Nav - White */}
      <div className="bg-white px-5 py-3 shadow-sm flex items-center justify-between">
        <img src={logo} alt="Key Doctors Solutions" className="h-10 object-contain" />
        <div className="flex items-center gap-3">
          <SyncStatusBadge />
          <button onClick={() => navigate("/notifications")} className="relative p-2 rounded-full hover:bg-muted transition-colors" aria-label="Open notifications">
            <Bell className="h-5 w-5 text-foreground" />
            {unreadNotifications > 0 && <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />}
          </button>
          <button onClick={() => navigate("/profile")} className="p-1 rounded-full hover:bg-muted transition-colors" aria-label="Open profile">
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
              { label: "Sales", value: maskSensitiveValue(formatCurrency(totalSales), security.hideAmounts) },
              { label: "Purchased", value: maskSensitiveValue(formatCurrency(totalPurchases), security.hideAmounts) },
              { label: "Profit", value: maskSensitiveValue(formatCurrency(totalProfit), security.hideAmounts) },
              { label: "Expense", value: maskSensitiveValue(formatCurrency(totalExpense), security.hideAmounts) },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-primary/70 text-xs font-medium">{item.label}</p>
                <p className="text-white font-bold text-lg">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">
        {fSales.length > 0 && <Section title="Sales" items={fSales} />}
        {fPurchase.length > 0 && <Section title="Purchase" items={fPurchase} />}
        {fInventory.length > 0 && <Section title="Inventory" items={fInventory} />}
        {fPeople.length > 0 && <Section title="People" items={fPeople} />}
        {fFinance.length > 0 && <Section title="Finance & Reports" items={fFinance} />}
        {fHrm.length > 0 && <Section title="HRM" items={fHrm} />}
      </div>

      <BottomNav />
    </div>
  );
};

const Section = ({ title, items }: { title: string; items: { icon: LucideIcon; label: string; path: string; color: string }[] }) => (
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
