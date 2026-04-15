import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const PurchaseReturnReport = () => {
  const returns = store.getPurchaseReturns();
  const total = returns.reduce((s, r) => s + r.total, 0);
  return (
    <ReportPage
      title="Purchase Return Report"
      data={returns}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "supplierName", label: "Supplier" },
        { key: "total", label: "Total", render: (r) => <span className="font-semibold">{formatCurrency(r.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Returns", value: formatCurrency(total), color: "#8e44ad" }]}
      searchKeys={["invoiceNo", "supplierName"]}
      dateKey="date"
    />
  );
};
export default PurchaseReturnReport;
