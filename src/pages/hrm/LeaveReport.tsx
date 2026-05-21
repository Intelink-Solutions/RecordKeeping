import ReportPage from "@/components/ReportPage";
import { store, Leave } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";

const LeaveReport = () => {
  const { items: leaves } = useHrmLiveList<Leave>({
    resource: "leaves",
    localGet: () => store.getLeaves(),
    localSave: (next) => store.saveLeaves(next),
  });

  const pending  = leaves.filter(l => l.status === "Pending").length;
  const approved = leaves.filter(l => l.status === "Approved").length;
  const rejected = leaves.filter(l => l.status === "Rejected").length;

  return (
    <ReportPage
      title="Leave Report"
      data={leaves as unknown as Record<string, unknown>[]}
      columns={[
        { key: "employeeName",  label: "Employee" },
        { key: "leaveTypeName", label: "Type" },
        { key: "startDate",     label: "Start" },
        { key: "endDate",       label: "End" },
        { key: "reason",        label: "Reason" },
        { key: "status", label: "Status", render: (l) => {
          const s = String(l.status ?? "");
          return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              s === "Approved" ? "bg-green-100 text-green-700"
              : s === "Rejected" ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
            }`}>{s}</span>
          );
        }},
      ]}
      summaryCards={[
        { label: "Pending",  value: String(pending),  color: "#e67e22" },
        { label: "Approved", value: String(approved), color: "#27ae60" },
        { label: "Rejected", value: String(rejected), color: "#e74c3c" },
      ]}
      searchKeys={["employeeName", "leaveTypeName"]}
      dateKey="startDate"
    />
  );
};
export default LeaveReport;
