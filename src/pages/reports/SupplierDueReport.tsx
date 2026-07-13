import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const SupplierDueReport = () => {
  const suppliers = store.getSuppliers();
  const withDue = suppliers.filter(s => s.due > 0);
  const totalDue = withDue.reduce((s, sup) => s + sup.due, 0);

  return (
    <ReportPage
      title="Supplier Debt Report"
      data={withDue}
      columns={[
        { key: "name", label: "Supplier" },
        { key: "phone", label: "Phone" },
        { key: "due", label: "Debt", render: (s) => <span className="font-semibold text-destructive">{formatCurrency(s.due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Debt", value: formatCurrency(totalDue), color: "#e74c3c" }]}
      searchKeys={["name", "phone"]}
      showDateFilter={false}
    />
  );
};
export default SupplierDueReport;
