import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";

const PurchaseReport = () => {
  const purchases = store.getPurchases();
  const total = purchases.reduce((s, p) => s + p.total, 0);
  return (
    <ReportPage
      title="Purchase Report"
      data={purchases}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "supplierName", label: "Supplier" },
        { key: "total", label: "Total", render: (p) => <span className="font-semibold">$ {p.total.toFixed(2)}</span> },
        { key: "paid", label: "Paid", render: (p) => <span>$ {p.paid.toFixed(2)}</span> },
        { key: "due", label: "Due", render: (p) => p.due > 0 ? <span className="text-destructive font-semibold">$ {p.due.toFixed(2)}</span> : <span>$ 0</span> },
        { key: "status", label: "Status", render: (p) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === "Paid" ? "bg-green-100 text-green-700" : p.status === "Due" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{p.status}</span>
        )},
      ]}
      summaryCards={[{ label: "Total Purchases", value: `$ ${total.toLocaleString()}`, color: "#2980b9" }]}
      searchKeys={["invoiceNo", "supplierName"]}
      dateKey="date"
    />
  );
};
export default PurchaseReport;
