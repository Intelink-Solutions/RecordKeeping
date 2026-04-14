import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";

const LeaveReport = () => {
  const leaves = store.getLeaves();
  const pending = leaves.filter(l => l.status === "Pending").length;
  const approved = leaves.filter(l => l.status === "Approved").length;
  const rejected = leaves.filter(l => l.status === "Rejected").length;

  return (
    <ReportPage
      title="Leave Report"
      data={leaves}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "leaveTypeName", label: "Type" },
        { key: "startDate", label: "Start" },
        { key: "endDate", label: "End" },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status", render: (l) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            l.status === "Approved" ? "bg-green-100 text-green-700" : l.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
          }`}>{l.status}</span>
        )},
      ]}
      summaryCards={[
        { label: "Pending", value: String(pending), color: "#e67e22" },
        { label: "Approved", value: String(approved), color: "#27ae60" },
        { label: "Rejected", value: String(rejected), color: "#e74c3c" },
      ]}
      searchKeys={["employeeName", "leaveTypeName"]}
      dateKey="startDate"
    />
  );
};
export default LeaveReport;
