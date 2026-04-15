import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const PurchaseTaxReport = () => {
  const purchases = store.getPurchases();
  // Purchases don't have VAT in current model, show as 0
  const data = purchases.map(p => ({ ...p, taxAmount: 0, taxPercent: 0 }));

  return (
    <ReportPage
      title="Purchase Tax Report"
      data={data}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "supplierName", label: "Supplier" },
        { key: "subtotal", label: "Subtotal", render: (p) => <span>{formatCurrency(p.subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "taxPercent", label: "Tax %" },
        { key: "taxAmount", label: "Tax", render: (p) => <span>{formatCurrency(p.taxAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "total", label: "Total", render: (p) => <span className="font-semibold">{formatCurrency(p.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Tax", value: formatCurrency(0), color: "#2980b9" }]}
      searchKeys={["invoiceNo", "supplierName"]}
      dateKey="date"
    />
  );
};
export default PurchaseTaxReport;
