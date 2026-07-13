import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Download, Printer, Search } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const ProfitLossHistory = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const sales = store.getSales();
  const incomes = store.getIncomes();
  const expenses = store.getExpenses();

  const filteredSales = sales.filter(s => (!fromDate || s.date >= fromDate) && (!toDate || s.date <= toDate));
  const filteredIncomes = incomes.filter(i => (!fromDate || i.date >= fromDate) && (!toDate || i.date <= toDate));
  const filteredExpenses = expenses.filter(e => (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate));

  const totalSalesRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
  const totalIncomeAmount = filteredIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenseAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalSalesRevenue + totalIncomeAmount;
  const netProfit = grossProfit - totalExpenseAmount;

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Profit & Loss History" />
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl p-3 shadow-sm border border-border text-center">
            <p className="text-[10px] text-muted-foreground">Gross Profit</p>
            <p className="font-bold text-sm text-green-600">{formatCurrency(grossProfit)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-sm border border-border text-center">
            <p className="text-[10px] text-muted-foreground">Expenses</p>
            <p className="font-bold text-sm text-red-600">{formatCurrency(totalExpenseAmount)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 shadow-sm border border-border text-center">
            <p className="text-[10px] text-muted-foreground">Net Profit</p>
            <p className={`font-bold text-sm ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(netProfit)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-green-50 px-4 py-2"><h4 className="text-xs font-bold text-green-700">Income</h4></div>
          <div className="px-4 py-2 flex justify-between text-sm border-b border-border">
            <span>Sales Revenue</span><span className="font-semibold">{formatCurrency(totalSalesRevenue)}</span>
          </div>
          <div className="px-4 py-2 flex justify-between text-sm border-b border-border">
            <span>Other Income</span><span className="font-semibold">{formatCurrency(totalIncomeAmount)}</span>
          </div>
          <div className="px-4 py-2 flex justify-between text-sm font-bold bg-green-50/50">
            <span>Total Income</span><span className="text-green-600">{formatCurrency(grossProfit)}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-red-50 px-4 py-2"><h4 className="text-xs font-bold text-red-700">Expenses</h4></div>
          <div className="px-4 py-2 flex justify-between text-sm border-b border-border">
            <span>Total Expenses</span><span className="font-semibold">{formatCurrency(totalExpenseAmount)}</span>
          </div>
          <div className="px-4 py-2 flex justify-between text-sm font-bold bg-red-50/50">
            <span>Net Profit/Loss</span>
            <span className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(netProfit)}</span>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
export default ProfitLossHistory;
