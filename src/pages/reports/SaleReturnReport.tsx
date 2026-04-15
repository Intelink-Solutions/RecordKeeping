import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const SaleReturnReport = () => {
  const returns = store.getSaleReturns();
  const total = returns.reduce((s, r) => s + r.total, 0);
  return (
    <ReportPage
      title="Sale Return Report"
      data={returns}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer" },
        { key: "total", label: "Total", render: (r) => <span className="font-semibold">{formatCurrency(r.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Returns", value: formatCurrency(total), color: "#e67e22" }]}
      searchKeys={["invoiceNo", "customerName"]}
      dateKey="date"
    />
  );
};
export default SaleReturnReport;
