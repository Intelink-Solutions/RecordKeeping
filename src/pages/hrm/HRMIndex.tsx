import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Users, Briefcase, Clock, UserCheck, CalendarDays, CalendarOff, ClipboardList, DollarSign, BarChart3, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { filterMenuItems } from "@/lib/permissions";
import { useAppContext } from "@/hooks/use-app-context";

const hrmItems = [
  { icon: Briefcase, label: "Departments", path: "/hrm/departments", color: "#2980b9" },
  { icon: UserCheck, label: "Designations", path: "/hrm/designations", color: "#27ae60" },
  { icon: Clock, label: "Shifts", path: "/hrm/shifts", color: "#e67e22" },
  { icon: Users, label: "Employees", path: "/hrm/employees", color: "#8e44ad" },
  { icon: CalendarDays, label: "Leave Types", path: "/hrm/leave-types", color: "#e74c3c" },
  { icon: CalendarOff, label: "Leaves", path: "/hrm/leaves", color: "#2980b9" },
  { icon: CalendarDays, label: "Holidays", path: "/hrm/holidays", color: "#27ae60" },
  { icon: ClipboardList, label: "Attendance", path: "/hrm/attendance", color: "#e67e22" },
  { icon: DollarSign, label: "Payroll", path: "/hrm/payroll", color: "#e74c3c" },
  { icon: BarChart3, label: "Attendance Report", path: "/hrm/attendance-report", color: "#8e44ad" },
  { icon: FileText, label: "Payroll Report", path: "/hrm/payroll-report", color: "#2980b9" },
  { icon: FileText, label: "Leave Report", path: "/hrm/leave-report", color: "#27ae60" },
];

const HRMIndex = () => {
  const navigate = useNavigate();
  const { role } = useAppContext();
  const visibleItems = filterMenuItems(hrmItems, role);

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="HRM" />
      <div className="px-4 py-4 space-y-2">
        {visibleItems.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full bg-card rounded-xl p-3.5 shadow-sm border border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color + "18", color: item.color }}>
              <item.icon size={18} />
            </div>
            <span className="font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};
export default HRMIndex;
