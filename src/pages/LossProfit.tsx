import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const LossProfit = () => {
  const [fromDate, setFromDate] = useState("2021-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const sales = store.getSales();

  const filtered = sales.filter((s) => s.date >= fromDate && s.date <= toDate);
  const totalProfit = filtered.reduce((s, sale) => s + Math.max(0, sale.profit), 0);
  const totalLoss = filtered.reduce((s, sale) => s + Math.abs(Math.min(0, sale.profit)), 0);

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Loss/Profit" />
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="bg-accent/50 border-2 border-primary/20 rounded-xl flex overflow-hidden">
          <div className="flex-1 p-4 text-center">
            <p className="text-success font-bold text-xl">{formatCurrency(totalProfit, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
            <p className="text-sm text-muted-foreground">Profit</p>
          </div>
          <div className="w-px bg-primary/20" />
          <div className="flex-1 p-4 text-center">
            <p className="text-destructive font-bold text-xl">{formatCurrency(totalLoss, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
            <p className="text-sm text-muted-foreground">Loss</p>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((s) => (
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
                  <p className="text-xs text-muted-foreground">Total : {formatCurrency(s.total)}</p>
                  <p className="text-xs font-semibold text-primary">Profit : {formatCurrency(s.profit)}</p>
                </div>
                <button className="text-muted-foreground"><Printer size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default LossProfit;
