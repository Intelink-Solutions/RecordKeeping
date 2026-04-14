import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const LossProfit = () => {
  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  const sales = store.getSales();
  const expenses = store.getExpenses();
  const incomes = store.getIncomes();

  const filtered = useMemo(() => ({
    sales: sales.filter(s => s.date >= fromDate && s.date <= toDate),
    expenses: expenses.filter(e => e.date >= fromDate && e.date <= toDate),
    incomes: incomes.filter(i => i.date >= fromDate && i.date <= toDate),
  }), [sales, expenses, incomes, fromDate, toDate]);

  const totalSales = filtered.sales.reduce((s, sale) => s + sale.total, 0);
  const totalProfit = filtered.sales.reduce((s, sale) => s + Math.max(0, sale.profit), 0);
  const totalLoss = filtered.sales.reduce((s, sale) => s + Math.abs(Math.min(0, sale.profit)), 0);
  const totalIncome = filtered.incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = filtered.expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalSales + totalIncome - totalExpense;
  const netProfit = totalProfit - totalLoss + totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Profit & Loss" />
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] text-muted-foreground mb-1 block">From</label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><label className="text-[11px] text-muted-foreground mb-1 block">To</label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-success/10 rounded-xl p-3 text-center">
            <TrendingUp size={18} className="text-success mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Gross Profit</p>
            <p className="font-bold text-sm text-success">$ {grossProfit.toLocaleString()}</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3 text-center">
            <TrendingDown size={18} className="text-destructive mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Expenses</p>
            <p className="font-bold text-sm text-destructive">$ {totalExpense.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${netProfit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
            <DollarSign size={18} className={`mx-auto mb-1 ${netProfit >= 0 ? "text-success" : "text-destructive"}`} />
            <p className="text-[10px] text-muted-foreground">Net Profit</p>
            <p className={`font-bold text-sm ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>$ {netProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Income Section */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-success/5 border-b border-border"><span className="text-sm font-bold text-success">Income</span></div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sales Revenue</span><span className="font-semibold">$ {totalSales.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sales Profit</span><span className="font-semibold text-success">$ {totalProfit.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Other Income</span><span className="font-semibold">$ {totalIncome.toLocaleString()}</span></div>
            {totalLoss > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sales Loss</span><span className="font-semibold text-destructive">-$ {totalLoss.toLocaleString()}</span></div>}
          </div>
        </div>

        {/* Expense Section */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-destructive/5 border-b border-border"><span className="text-sm font-bold text-destructive">Expenses</span></div>
          <div className="p-4 space-y-2">
            {filtered.expenses.length > 0 ? filtered.expenses.map(e => (
              <div key={e.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{e.categoryName}: {e.description}</span>
                <span className="font-semibold">$ {e.amount.toLocaleString()}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No expenses in this period</p>}
            <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
              <span>Total Expenses</span>
              <span className="text-destructive">$ {totalExpense.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Bill-wise */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-primary/5 border-b border-border"><span className="text-sm font-bold text-primary">Bill-wise P&L</span></div>
          <div className="divide-y divide-border">
            {filtered.sales.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{s.invoiceNo}</p>
                  <p className="text-[11px] text-muted-foreground">{s.customerName} • {s.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">$ {s.total.toLocaleString()}</p>
                  <p className={`font-bold text-sm ${s.profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {s.profit >= 0 ? "+" : ""}$ {s.profit.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default LossProfit;
