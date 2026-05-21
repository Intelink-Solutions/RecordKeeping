import { Home, LayoutGrid, FileText, Settings, ShoppingBag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/hooks/use-app-context";

const tabs = [
  { icon: Home,       label: "Home",      path: "/home" },
  { icon: ShoppingBag, label: "Items",    path: "/items" },
  { icon: LayoutGrid, label: "Dashboard", path: "/dashboard" },
  { icon: FileText,   label: "Reports",   path: "/reports" },
  { icon: Settings,   label: "Setting",   path: "/settings" },
];

const BottomNav = () => {
  const { canAccessSettings } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const visibleTabs = canAccessSettings ? tabs : tabs.filter((tab) => tab.path !== "/settings");

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
      <div className="flex items-end justify-around h-16 max-w-lg mx-auto px-2">
        {visibleTabs.map((tab, idx) => {
          const active = location.pathname === tab.path;
          const isCenter = idx === 2; // Dashboard is the center tab
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 transition-colors ${
                isCenter ? "relative -top-4" : "py-1 px-2"
              } ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              {isCenter ? (
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
                  active
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-primary/40 text-primary"
                }`}>
                  <tab.icon size={24} strokeWidth={active ? 2.5 : 2} />
                </div>
              ) : (
                <>
                  <tab.icon size={22} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[11px] font-medium">{tab.label}</span>
                  {active && <div className="w-6 h-0.5 bg-primary rounded-full mt-0.5" />}
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
