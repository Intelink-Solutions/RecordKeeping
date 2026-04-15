import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/currency";

const DueTransactions = () => {
  const sales = store.getSales();
  const data = useMemo(() => {
    return sales.filter(s => s.due > 0 || s.status !== "Paid").map(s => ({
      invoiceNo: s.invoiceNo,
      date: s.date,
      customerName: s.customerName,
      total: s.total,
      paid: s.paid,
      due: s.due,
    }));
  }, [sales]);

  const totalDue = data.reduce((s, d) => s + d.due, 0);
  const totalPaid = data.reduce((s, d) => s + d.paid, 0);

  return (
    <ReportPage
      title="Due Transactions"
      data={data}
      columns={[
        { key: "invoiceNo", label: "Invoice" },
        { key: "date", label: "Date" },
        { key: "customerName", label: "Customer" },
        { key: "total", label: "Total", render: (d) => <span>{formatCurrency(d.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "paid", label: "Paid", render: (d) => <span className="text-green-600">{formatCurrency(d.paid, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "due", label: "Due", render: (d) => <span className="text-red-600 font-semibold">{formatCurrency(d.due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[
        { label: "Total Due", value: formatCurrency(totalDue), color: "#e74c3c" },
        { label: "Total Paid", value: formatCurrency(totalPaid), color: "#27ae60" },
      ]}
      searchKeys={["invoiceNo", "customerName"]}
      dateKey="date"
    />
  );
};
export default DueTransactions;
