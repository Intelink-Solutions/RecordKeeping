import ReportPage from "@/components/ReportPage";
import { store, paymentStatusLabel } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { useStoreRefresh } from "@/hooks/use-live-data";

const PurchaseReport = () => {
  useStoreRefresh();
  const effectiveBranchId = store.getEffectiveBranchId();
  const activeBranch = effectiveBranchId ? store.getBranches().find((b) => b.id === effectiveBranchId) : null;
  const allPurchases = store.getPurchases();
  const purchases = effectiveBranchId
    ? allPurchases.filter((p) => !p.branchId || p.branchId === effectiveBranchId)
    : allPurchases;
  const total = purchases.reduce((s, p) => s + p.total, 0);

  return (
    <ReportPage
      title={activeBranch ? `Purchases — ${activeBranch.name}` : "Purchase Report"}
      data={purchases}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "supplierName", label: "Supplier" },
        { key: "total", label: "Total", render: (p) => <span className="font-semibold">{formatCurrency(p.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "paid", label: "Paid", render: (p) => <span>{formatCurrency(p.paid, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "due", label: "Debt", render: (p) => p.due > 0 ? <span className="text-destructive font-semibold">{formatCurrency(p.due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span>{formatCurrency(0)}</span> },
        { key: "status", label: "Status", render: (p) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === "Paid" ? "bg-green-100 text-green-700" : p.status === "Due" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{paymentStatusLabel(p.status)}</span>
        )},
      ]}
      summaryCards={[{ label: activeBranch ? `${activeBranch.name} Purchases` : "Total Purchases", value: formatCurrency(total), color: "#2980b9" }]}
      searchKeys={["invoiceNo", "supplierName"]}
      dateKey="date"
    />
  );
};
export default PurchaseReport;
