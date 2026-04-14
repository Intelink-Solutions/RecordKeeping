import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { BarChart3, TrendingUp, DollarSign, Wallet, Package, Users, Truck, FileText, ShoppingCart, ShoppingBag, Receipt, CreditCard, Star, Percent, History } from "lucide-react";
import { useNavigate } from "react-router-dom";

const reportSections = [
  {
    title: "Sales & Purchase",
    items: [
      { icon: ShoppingCart, label: "Sales Report", path: "/report/sales", color: "#27ae60" },
      { icon: TrendingUp, label: "Sale Return Report", path: "/report/sale-returns", color: "#e67e22" },
      { icon: ShoppingBag, label: "Purchase Report", path: "/report/purchases", color: "#2980b9" },
      { icon: Receipt, label: "Purchase Return Report", path: "/report/purchase-returns", color: "#8e44ad" },
    ],
  },
  {
    title: "Tax Reports",
    items: [
      { icon: CreditCard, label: "Sales Tax Report", path: "/report/sales-tax", color: "#e74c3c" },
      { icon: CreditCard, label: "Purchase Tax Report", path: "/report/purchase-tax", color: "#2980b9" },
    ],
  },
  {
    title: "Financial",
    items: [
      { icon: DollarSign, label: "Income Report", path: "/report/income", color: "#27ae60" },
      { icon: Wallet, label: "Expense Report", path: "/report/expenses", color: "#e74c3c" },
      { icon: BarChart3, label: "Profit & Loss (Bill)", path: "/report/profit-loss-bill", color: "#2980b9" },
      { icon: TrendingUp, label: "Profit & Loss (Product)", path: "/report/profit-loss-product", color: "#e67e22" },
      { icon: History, label: "P&L History", path: "/report/profit-loss-history", color: "#8e44ad" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { icon: Package, label: "Stock Report", path: "/report/stock", color: "#8e44ad" },
      { icon: FileText, label: "Product Sales", path: "/report/product-sales", color: "#27ae60" },
      { icon: FileText, label: "Product Purchases", path: "/report/product-purchases", color: "#2980b9" },
      { icon: Percent, label: "Discounted Products", path: "/report/discounted", color: "#e67e22" },
    ],
  },
  {
    title: "Parties",
    items: [
      { icon: Users, label: "Customer Due", path: "/report/customer-due", color: "#27ae60" },
      { icon: Truck, label: "Supplier Due", path: "/report/supplier-due", color: "#e67e22" },
      { icon: DollarSign, label: "Due Transactions", path: "/report/due-transactions", color: "#e74c3c" },
      { icon: Star, label: "Top Customers", path: "/report/top-customers", color: "#2980b9" },
      { icon: Star, label: "Top Suppliers", path: "/report/top-suppliers", color: "#8e44ad" },
      { icon: Star, label: "Top Products", path: "/report/top-products", color: "#27ae60" },
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
            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-2">{section.title}</h3>
            <div className="space-y-2">
              {section.items.map((r) => (
                <button key={r.label} onClick={() => navigate(r.path)} className="w-full bg-card rounded-xl p-3.5 shadow-sm border border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: r.color + "18", color: r.color }}>
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
