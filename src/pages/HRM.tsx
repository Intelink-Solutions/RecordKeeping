import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Building2, Briefcase, Clock, Users, Calendar, CalendarDays, ClipboardCheck, Wallet, BarChart3, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const hrmItems = [
  { icon: Building2, label: "Departments", path: "/departments", color: "#27ae60" },
  { icon: Briefcase, label: "Designations", path: "/designations", color: "#2980b9" },
  { icon: Clock, label: "Shifts", path: "/shifts", color: "#e67e22" },
  { icon: Users, label: "Employees", path: "/employees", color: "#8e44ad" },
  { icon: Calendar, label: "Leave Types", path: "/leave-types", color: "#16a085" },
  { icon: CalendarDays, label: "Leaves", path: "/leaves", color: "#c0392b" },
  { icon: CalendarDays, label: "Holidays", path: "/holidays", color: "#f39c12" },
  { icon: ClipboardCheck, label: "Attendance", path: "/attendance", color: "#2c3e50" },
  { icon: Wallet, label: "Payroll", path: "/payroll", color: "#e74c3c" },
];

const HRM = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="HRM" />
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          {hrmItems.map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color + "15", color: item.color }}>
                <item.icon size={18} />
              </div>
              <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default HRM;
