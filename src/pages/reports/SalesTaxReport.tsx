import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/currency";

const SalesTaxReport = () => {
  const sales = store.getSales();
  const data = useMemo(() => sales.filter(s => s.vat > 0).map(s => ({
    ...s, taxAmount: s.vat,
  })), [sales]);
  const totalTax = data.reduce((s, d) => s + d.taxAmount, 0);

  return (
    <ReportPage
      title="Sales Tax Report"
      data={data}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer" },
        { key: "subtotal", label: "Subtotal", render: (s) => <span>{formatCurrency(s.subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "vatPercent", label: "Tax %", render: (s) => <span>{s.vatPercent}%</span> },
        { key: "taxAmount", label: "Tax", render: (s) => <span className="font-semibold">{formatCurrency(s.taxAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "total", label: "Total", render: (s) => <span>{formatCurrency(s.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Tax", value: formatCurrency(totalTax), color: "#e74c3c" }]}
      searchKeys={["invoiceNo", "customerName"]}
      dateKey="date"
    />
  );
};
export default SalesTaxReport;
