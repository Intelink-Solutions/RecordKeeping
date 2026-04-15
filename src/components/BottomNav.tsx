import { Home, LayoutGrid, FileText, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/hooks/use-app-context";

const tabs = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: LayoutGrid, label: "Dashboard", path: "/dashboard" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Setting", path: "/settings" },
];

const BottomNav = () => {
  const { canAccessSettings } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const visibleTabs = canAccessSettings ? tabs : tabs.filter((tab) => tab.path !== "/settings");

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {visibleTabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{tab.label}</span>
              {active && (
                <div className="w-6 h-0.5 bg-primary rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
