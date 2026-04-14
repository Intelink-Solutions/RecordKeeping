import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { BarChart3, TrendingUp, DollarSign, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const reportItems = [
  { icon: BarChart3, label: "Sales Report", path: "/sales", color: "#27ae60" },
  { icon: TrendingUp, label: "Loss/Profit", path: "/loss-profit", color: "#2980b9" },
  { icon: DollarSign, label: "Income Report", path: "/sales", color: "#e67e22" },
  { icon: Wallet, label: "Expense Report", path: "/sales", color: "#e74c3c" },
];

const Reports = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Reports" />
      <div className="px-4 py-4 space-y-3">
        {reportItems.map((r) => (
          <button key={r.label} onClick={() => navigate(r.path)} className="w-full bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: r.color + "18", color: r.color }}>
              <r.icon size={20} />
            </div>
            <span className="font-semibold text-sm">{r.label}</span>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default Reports;
