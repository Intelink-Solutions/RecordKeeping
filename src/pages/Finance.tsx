import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { Landmark, Wallet, FileText, DollarSign, TrendingUp, TrendingDown, CreditCard, BookOpen } from "lucide-react";

const financeItems = [
  { icon: Landmark, label: "Profit & Loss", path: "/loss-profit", color: "#2980b9" },
  { icon: Wallet, label: "Expenses", path: "/expenses", color: "#e74c3c" },
  { icon: DollarSign, label: "Income", path: "/income", color: "#27ae60" },
  { icon: CreditCard, label: "Expense Categories", path: "/expense-categories", color: "#8e44ad" },
  { icon: BookOpen, label: "Income Categories", path: "/income-categories", color: "#e67e22" },
];

const Finance = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Finance & Accounts" />
      <div className="px-4 py-4 space-y-3">
        {financeItems.map(item => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3 active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color + "18", color: item.color }}>
              <item.icon size={20} />
            </div>
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default Finance;
