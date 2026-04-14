import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";

const ProfitLossBill = () => {
  const sales = store.getSales();
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalProfit = sales.reduce((s, sale) => s + Math.max(0, sale.profit), 0);
  const totalLoss = sales.reduce((s, sale) => s + Math.abs(Math.min(0, sale.profit)), 0);

  return (
    <ReportPage
      title="Profit & Loss (Bill-wise)"
      data={sales}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer" },
        { key: "total", label: "Total", render: (s) => <span>$ {s.total.toFixed(2)}</span> },
        { key: "profit", label: "Profit/Loss", render: (s) => (
          <span className={`font-semibold ${s.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            $ {s.profit.toFixed(2)}
          </span>
        )},
      ]}
      summaryCards={[
        { label: "Total Sales", value: `$ ${totalSales.toLocaleString()}`, color: "#2980b9" },
        { label: "Total Profit", value: `$ ${totalProfit.toLocaleString()}`, color: "#27ae60" },
        { label: "Total Loss", value: `$ ${totalLoss.toLocaleString()}`, color: "#e74c3c" },
      ]}
      searchKeys={["invoiceNo", "customerName"]}
      dateKey="date"
    />
  );
};
export default ProfitLossBill;
