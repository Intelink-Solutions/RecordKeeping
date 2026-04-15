import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const SalesReport = () => {
  const sales = store.getSales();
  const total = sales.reduce((s, sale) => s + sale.total, 0);

  return (
    <ReportPage
      title="Sales Report"
      data={sales}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer" },
        { key: "total", label: "Total", render: (s) => <span className="font-semibold">{formatCurrency(s.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "paid", label: "Paid", render: (s) => <span>{formatCurrency(s.paid, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "due", label: "Due", render: (s) => s.due > 0 ? <span className="text-destructive font-semibold">{formatCurrency(s.due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span>{formatCurrency(0)}</span> },
        { key: "status", label: "Status", render: (s) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.status === "Paid" ? "bg-green-100 text-green-700" : s.status === "Due" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
        )},
      ]}
      summaryCards={[{ label: "Total Sales", value: formatCurrency(total), color: "#27ae60" }]}
      searchKeys={["invoiceNo", "customerName"]}
      dateKey="date"
    />
  );
};
export default SalesReport;
