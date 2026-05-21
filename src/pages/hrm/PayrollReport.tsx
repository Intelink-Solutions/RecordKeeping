import { useEffect, useState } from "react";
import ReportPage from "@/components/ReportPage";
import { store, Payroll } from "@/lib/store";
import { apiListHrmResource } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

const PayrollReport = () => {
  const [payroll, setPayroll] = useState<Payroll[]>(store.getPayroll());

  useEffect(() => {
    if (!store.getBusinessProfile().isOnline) return;
    apiListHrmResource<Payroll>("payrolls").then((remote) => {
      if (remote.length > 0) {
        setPayroll(remote);
        store.savePayroll(remote);
      }
    }).catch(() => {});
  }, []);

  const totalAmount = payroll.reduce((s, p) => s + (p.amount || 0), 0);
  const byType = payroll.reduce<Record<string, number>>((acc, p) => {
    const t = p.paymentType || "Other";
    acc[t] = (acc[t] || 0) + (p.amount || 0);
    return acc;
  }, {});

  const data = payroll as unknown as Record<string, unknown>[];

  return (
    <ReportPage
      title="Payroll Report"
      data={data}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "month",        label: "Month" },
        { key: "paymentYear",  label: "Year" },
        { key: "date",         label: "Date" },
        { key: "amount", label: "Amount", render: (p) => (
          <span className="font-semibold">{formatCurrency((p.amount as number) || 0)}</span>
        )},
        { key: "paymentType", label: "Type" },
      ]}
      summaryCards={[
        { label: "Total Paid", value: formatCurrency(totalAmount),          color: "#27ae60" },
        { label: "Cash",       value: formatCurrency(byType["Cash"] || 0),  color: "#2980b9" },
        { label: "Bank",       value: formatCurrency(byType["Bank"] || 0),  color: "#8e44ad" },
      ]}
      searchKeys={["employeeName", "paymentType"]}
      dateKey="date"
    />
  );
};
export default PayrollReport;
