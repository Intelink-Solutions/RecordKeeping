import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { CalendarDays, GitBranch, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { maskSensitiveValue } from "@/lib/security";
import type { Sale, Expense, Purchase } from "@/lib/store";

interface HomeSummaryCardProps {
  sales: Sale[];
  expenses: Expense[];
  purchases: Purchase[];
  activeBranchName?: string;
  hideAmounts: boolean;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Dark/glass "Today's Summary" card: today's real sales/profit/expense plus
 * a real 7-day Profit/Expense trend chart. Both are backed by actual sale
 * records grouped by date — sales/expenses only store a date (no time of
 * day), so an hour-by-hour chart isn't derivable; a day-by-day one is. */
const HomeSummaryCard = ({ sales, expenses, purchases, activeBranchName, hideAmounts }: HomeSummaryCardProps) => {
  const navigate = useNavigate();

  const { chartData, today, yesterday } = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return toDateStr(d);
    });

    const rows = days.map((day) => {
      const daySales = sales.filter((s) => s.date === day);
      const dayExpenses = expenses.filter((e) => e.date === day);
      const dayPurchases = purchases.filter((p) => p.date === day);
      return {
        date: day,
        label: new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
        sales: daySales.reduce((s, x) => s + x.total, 0),
        profit: daySales.reduce((s, x) => s + x.profit, 0),
        expense: dayExpenses.reduce((s, x) => s + x.amount, 0),
        purchased: dayPurchases.reduce((s, x) => s + x.total, 0),
      };
    });

    return { chartData: rows, today: rows[rows.length - 1], yesterday: rows[rows.length - 2] };
  }, [sales, expenses, purchases]);

  const trendPct = (curr: number, prev: number): number | null => (prev > 0 ? ((curr - prev) / prev) * 100 : null);
  const profitTrend = trendPct(today.profit, yesterday.profit);
  const expenseTrend = trendPct(today.expense, yesterday.expense);
  const purchasedTrend = trendPct(today.purchased, yesterday.purchased);

  const todayLabel = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5"
      style={{ background: "linear-gradient(160deg, #0f1729 0%, #0b1220 100%)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 260, height: 260, top: -120, right: -100, background: "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent 70%)" }}
      />

      <div className="relative flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h2 className="text-white font-bold text-base">Today's Summary</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <CalendarDays size={12} className="text-white/50 shrink-0" />
            <span className="text-white/50 text-xs truncate">{todayLabel}</span>
          </div>
        </div>
        {activeBranchName ? (
          <span className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1 shrink-0">
            <GitBranch size={10} className="text-white/80" />
            <span className="text-[10px] font-semibold text-white/80 truncate max-w-[90px]">{activeBranchName}</span>
          </span>
        ) : (
          <button
            onClick={() => navigate("/reports")}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0"
          >
            <BarChart3 size={12} />
            View Report
          </button>
        )}
      </div>

      <div className="relative">
        <p className="text-white/50 text-[11px]">Sales Today</p>
        <p className="text-white font-bold text-3xl leading-tight truncate">
          {maskSensitiveValue(formatCurrency(today.sales), hideAmounts)}
        </p>
      </div>

      <div className="relative grid grid-cols-3 gap-3 mt-4">
        <div>
          <p className="text-white/50 text-[11px]">Profit</p>
          <div className="flex items-center gap-1.5">
            <p className="text-white font-bold text-sm">{maskSensitiveValue(formatCurrency(today.profit), hideAmounts)}</p>
            {profitTrend !== null && (
              <span className={`flex items-center text-[10px] font-semibold ${profitTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {profitTrend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {Math.abs(profitTrend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-white/50 text-[11px]">Expense</p>
          <div className="flex items-center gap-1.5">
            <p className="text-white font-bold text-sm">{maskSensitiveValue(formatCurrency(today.expense), hideAmounts)}</p>
            {expenseTrend !== null && (
              <span className={`flex items-center text-[10px] font-semibold ${expenseTrend <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {expenseTrend <= 0 ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
                {Math.abs(expenseTrend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-white/50 text-[11px]">Purchased</p>
          <div className="flex items-center gap-1.5">
            <p className="text-white font-bold text-sm">{maskSensitiveValue(formatCurrency(today.purchased), hideAmounts)}</p>
            {purchasedTrend !== null && (
              <span className={`flex items-center text-[10px] font-semibold ${purchasedTrend <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {purchasedTrend <= 0 ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
                {Math.abs(purchasedTrend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative h-20 mt-3 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="homeSummaryProfitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="homeSummaryExpenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#0f1729", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
              itemStyle={{ color: "rgba(255,255,255,0.9)" }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#homeSummaryProfitFill)" />
            <Area type="monotone" dataKey="expense" name="Expense" stroke="hsl(var(--warning))" strokeWidth={2} fill="url(#homeSummaryExpenseFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HomeSummaryCard;
