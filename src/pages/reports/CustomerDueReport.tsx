import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const CustomerDueReport = () => {
  const customers = store.getCustomers();
  const withDue = customers.filter(c => c.due > 0);
  const totalDue = withDue.reduce((s, c) => s + c.due, 0);

  return (
    <ReportPage
      title="Customer Due Report"
      data={withDue}
      columns={[
        { key: "name", label: "Customer" },
        { key: "phone", label: "Phone" },
        { key: "type", label: "Type", render: (c) => (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">{c.type}</span>
        )},
        { key: "due", label: "Due", render: (c) => <span className="font-semibold text-destructive">{formatCurrency(c.due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Due", value: formatCurrency(totalDue), color: "#e74c3c" }]}
      searchKeys={["name", "phone"]}
      showDateFilter={false}
    />
  );
};
export default CustomerDueReport;
