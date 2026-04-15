import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const ExpenseReport = () => {
  const expenses = store.getExpenses();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <ReportPage
      title="Expense Report"
      data={expenses}
      columns={[
        { key: "date", label: "Date" },
        { key: "categoryName", label: "Category" },
        { key: "description", label: "Description" },
        { key: "paymentType", label: "Payment" },
        { key: "amount", label: "Amount", render: (e) => <span className="font-semibold text-red-600">{formatCurrency(e.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      summaryCards={[{ label: "Total Expenses", value: formatCurrency(total), color: "#e74c3c" }]}
      searchKeys={["categoryName", "description"]}
      dateKey="date"
    />
  );
};
export default ExpenseReport;
