import { useEffect, useState } from "react";
import ReportPage from "@/components/ReportPage";
import { store, Attendance } from "@/lib/store";
import { apiListHrmResource } from "@/lib/api";

const AttendanceReport = () => {
  const [attendance, setAttendance] = useState<Attendance[]>(store.getAttendance());

  useEffect(() => {
    if (!store.getBusinessProfile().isOnline) return;
    apiListHrmResource<Attendance>("attendances").then((remote) => {
      if (remote.length > 0) {
        setAttendance(remote);
        store.saveAttendance(remote);
      }
    }).catch(() => {});
  }, []);

  const present = attendance.filter(a => a.status === "Present").length;
  const absent  = attendance.filter(a => a.status === "Absent").length;
  const late    = attendance.filter(a => a.status === "Late").length;

  const data = attendance as unknown as Record<string, unknown>[];

  return (
    <ReportPage
      title="Attendance Report"
      data={data}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "date",         label: "Date" },
        { key: "checkIn",      label: "Check In" },
        { key: "checkOut",     label: "Check Out" },
        { key: "status", label: "Status", render: (a) => {
          const s = (a.status as string) || "";
          return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              s === "Present" ? "bg-green-100 text-green-700"
              : s === "Late"  ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
            }`}>{s}</span>
          );
        }},
      ]}
      summaryCards={[
        { label: "Present", value: String(present), color: "#27ae60" },
        { label: "Absent",  value: String(absent),  color: "#e74c3c" },
        { label: "Late",    value: String(late),    color: "#e67e22" },
      ]}
      searchKeys={["employeeName"]}
      dateKey="date"
    />
  );
};
export default AttendanceReport;
