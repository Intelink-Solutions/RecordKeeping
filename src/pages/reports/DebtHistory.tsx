import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { useStoreRefresh } from "@/hooks/use-live-data";

const DebtHistory = () => {
  useStoreRefresh();
  const payments = store.getDuePayments();

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const customerTotal = payments.filter((p) => p.partyType === "Customer").reduce((s, p) => s + p.amount, 0);
  const supplierTotal = payments.filter((p) => p.partyType === "Supplier").reduce((s, p) => s + p.amount, 0);

  return (
    <ReportPage
      title="Debt History"
      data={payments}
      columns={[
        { key: "date", label: "Date" },
        { key: "partyName", label: "Party" },
        { key: "partyType", label: "Type", render: (p) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.partyType === "Supplier" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
            {p.partyType}
          </span>
        )},
        { key: "paymentType", label: "Method", render: (p) => <span className="capitalize">{p.paymentType || "-"}</span> },
        { key: "amount", label: "Amount", render: (p) => <span className="font-semibold text-primary">{formatCurrency(p.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[
        { label: "Total Collected", value: formatCurrency(totalCollected), color: "#27ae60" },
        { label: "From Customers", value: formatCurrency(customerTotal), color: "#2980b9" },
        { label: "From Suppliers", value: formatCurrency(supplierTotal), color: "#8e44ad" },
      ]}
      searchKeys={["partyName"]}
      dateKey="date"
    />
  );
};
export default DebtHistory;
