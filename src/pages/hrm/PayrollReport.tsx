import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

const PayrollReport = () => {
  const payroll = store.getPayroll();
  const totalPaid = payroll.filter(p => p.status === "Paid").reduce((s, p) => s + p.netSalary, 0);
  const totalUnpaid = payroll.filter(p => p.status === "Unpaid").reduce((s, p) => s + p.netSalary, 0);

  return (
    <ReportPage
      title="Payroll Report"
      data={payroll}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "month", label: "Month" },
        { key: "basicSalary", label: "Basic", render: (p) => <span>{formatCurrency(p.basicSalary)}</span> },
        { key: "bonus", label: "Bonus", render: (p) => <span>{formatCurrency(p.bonus)}</span> },
        { key: "deduction", label: "Deduct", render: (p) => <span>{formatCurrency(p.deduction)}</span> },
        { key: "netSalary", label: "Net", render: (p) => <span className="font-semibold">{formatCurrency(p.netSalary)}</span> },
        { key: "status", label: "Status", render: (p) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === "Paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{p.status}</span>
        )},
      ]}
      summaryCards={[
        { label: "Total Paid", value: formatCurrency(totalPaid), color: "#27ae60" },
        { label: "Total Unpaid", value: formatCurrency(totalUnpaid), color: "#e74c3c" },
      ]}
      searchKeys={["employeeName"]}
    />
  );
};
export default PayrollReport;
