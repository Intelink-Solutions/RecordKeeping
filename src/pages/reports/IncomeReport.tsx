import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const IncomeReport = () => {
  const incomes = store.getIncomes();
  const total = incomes.reduce((s, i) => s + i.amount, 0);
  return (
    <ReportPage
      title="Income Report"
      data={incomes}
      columns={[
        { key: "date", label: "Date" },
        { key: "categoryName", label: "Category" },
        { key: "description", label: "Description" },
        { key: "paymentType", label: "Payment" },
        { key: "amount", label: "Amount", render: (i) => <span className="font-semibold text-green-600">{formatCurrency(i.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Income", value: formatCurrency(total), color: "#27ae60" }]}
      searchKeys={["categoryName", "description"]}
      dateKey="date"
    />
  );
};
export default IncomeReport;
