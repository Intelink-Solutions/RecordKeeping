import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";

const AttendanceReport = () => {
  const attendance = store.getAttendance();
  const present = attendance.filter(a => a.status === "Present").length;
  const absent = attendance.filter(a => a.status === "Absent").length;
  const late = attendance.filter(a => a.status === "Late").length;

  return (
    <ReportPage
      title="Attendance Report"
      data={attendance}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "date", label: "Date" },
        { key: "checkIn", label: "Check In" },
        { key: "checkOut", label: "Check Out" },
        { key: "status", label: "Status", render: (a) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            a.status === "Present" ? "bg-green-100 text-green-700" : a.status === "Late" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
          }`}>{a.status}</span>
        )},
      ]}
      summaryCards={[
        { label: "Present", value: String(present), color: "#27ae60" },
        { label: "Absent", value: String(absent), color: "#e74c3c" },
        { label: "Late", value: String(late), color: "#e67e22" },
      ]}
      searchKeys={["employeeName"]}
      dateKey="date"
    />
  );
};
export default AttendanceReport;
