import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Printer } from "lucide-react";

const SalesList = () => {
  const sales = store.getSales();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Sales List" />
      <div className="px-4 py-3 space-y-3">
        {sales.map((s) => (
          <div key={s.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm">{s.customerName}</p>
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">{s.status}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">#{s.invoiceNo}</p>
                <p className="text-xs text-muted-foreground">{s.date}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-xs text-muted-foreground">Total : $ {s.total}</p>
                <p className="text-xs font-semibold text-primary">Profit : $ {s.profit}</p>
              </div>
              <button className="text-muted-foreground"><Printer size={18} /></button>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default SalesList;
