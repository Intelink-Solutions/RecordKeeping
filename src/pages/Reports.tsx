import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import {
  BarChart3, TrendingUp, DollarSign, Wallet, ShoppingCart, RotateCcw,
  Users, UserCheck, Package, FileText, CreditCard, Receipt, Percent
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const reportSections = [
  {
    title: "Sales & Purchase",
    items: [
      { icon: ShoppingCart, label: "Sales Report", path: "/sales", color: "#27ae60" },
      { icon: RotateCcw, label: "Sale Return Report", path: "/sale-returns", color: "#e67e22" },
      { icon: CreditCard, label: "Purchase Report", path: "/purchases", color: "#2980b9" },
      { icon: RotateCcw, label: "Purchase Return Report", path: "/purchase-returns", color: "#8e44ad" },
    ],
  },
  {
    title: "Finance",
    items: [
      { icon: TrendingUp, label: "Profit & Loss", path: "/loss-profit", color: "#27ae60" },
      { icon: DollarSign, label: "Income Report", path: "/incomes", color: "#16a085" },
      { icon: Wallet, label: "Expense Report", path: "/expenses", color: "#e74c3c" },
      { icon: Receipt, label: "Due Collection", path: "/due-list", color: "#f39c12" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { icon: Package, label: "Stock Report", path: "/stock-list", color: "#2c3e50" },
      { icon: BarChart3, label: "Low Stock", path: "/stock-list", color: "#e74c3c" },
    ],
  },
  {
    title: "Parties",
    items: [
      { icon: Users, label: "Customer Due Report", path: "/due-list", color: "#e67e22" },
      { icon: UserCheck, label: "Supplier Due Report", path: "/due-list", color: "#8e44ad" },
    ],
  },
];

const Reports = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Reports" />
      <div className="px-4 py-4 space-y-5">
        {reportSections.map((section) => (
          <div key={section.title}>
            <h3 className="font-bold text-sm text-muted-foreground mb-2">{section.title}</h3>
            <div className="space-y-2">
              {section.items.map((r) => (
                <button key={r.label} onClick={() => navigate(r.path)} className="w-full bg-card rounded-xl p-3.5 shadow-sm border border-border flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: r.color + "15", color: r.color }}>
                    <r.icon size={18} />
                  </div>
                  <span className="font-semibold text-sm">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default Reports;
