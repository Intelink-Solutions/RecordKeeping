import { useNavigate } from "react-router-dom";
import ReportPage from "@/components/ReportPage";
import { store, paymentStatusLabel, Sale } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { useStoreRefresh } from "@/hooks/use-live-data";

const SalesReport = () => {
  useStoreRefresh();
  const navigate = useNavigate();
  const effectiveBranchId = store.getEffectiveBranchId();
  const activeBranch = effectiveBranchId ? store.getBranches().find((b) => b.id === effectiveBranchId) : null;
  const allSales = store.getSales();
  const sales = effectiveBranchId
    ? allSales.filter((s) => !s.branchId || s.branchId === effectiveBranchId)
    : allSales;
  const total = sales.reduce((s, sale) => s + sale.total, 0);

  const handleRowClick = (sale: Sale) => {
    const identifier = sale.customerId && sale.customerId.trim()
      ? sale.customerId
      : encodeURIComponent(sale.customerName);
    navigate(`/report/sales/${identifier}`);
  };

  return (
    <ReportPage
      title={activeBranch ? `Sales — ${activeBranch.name}` : "Sales Report"}
      data={sales}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer" },
        { key: "total", label: "Total", render: (s) => <span className="font-semibold">{formatCurrency(s.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "paid", label: "Paid", render: (s) => <span>{formatCurrency(s.paid, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "due", label: "Debt", render: (s) => s.due > 0 ? <span className="text-destructive font-semibold">{formatCurrency(s.due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span>{formatCurrency(0)}</span> },
        { key: "status", label: "Status", render: (s) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.status === "Paid" ? "bg-green-100 text-green-700" : s.status === "Due" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{paymentStatusLabel(s.status)}</span>
        )},
      ]}
      summaryCards={[{ label: activeBranch ? `${activeBranch.name} Sales` : "Total Sales", value: formatCurrency(total), color: "#27ae60" }]}
      searchKeys={["invoiceNo", "customerName"]}
      dateKey="date"
      onRowClick={handleRowClick}
    />
  );
};
export default SalesReport;
