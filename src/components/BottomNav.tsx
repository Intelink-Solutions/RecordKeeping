import { Home, LayoutGrid, FileText, Settings, ShoppingBag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/hooks/use-app-context";

const tabs = [
  { icon: Home,        label: "Home",      path: "/home" },
  { icon: ShoppingBag, label: "Items",     path: "/items" },
  { icon: LayoutGrid,  label: "Dashboard", path: "/dashboard" },
  { icon: FileText,    label: "Reports",   path: "/reports" },
  { icon: Settings,    label: "Settings",  path: "/settings" },
];

const BottomNav = () => {
  const { canAccessSettings } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const visibleTabs = canAccessSettings ? tabs : tabs.filter((tab) => tab.path !== "/settings");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(14px+env(safe-area-inset-bottom,0px))] pointer-events-none">
      <div
        className="flex items-center justify-around max-w-lg mx-auto px-2 pointer-events-auto bg-card border border-border rounded-[28px]"
        style={{ height: "66px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
      >
        {visibleTabs.map((tab, idx) => {
          const active = location.pathname === tab.path;
          const isCenter = idx === Math.floor(visibleTabs.length / 2);

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 transition-all duration-200 py-1.5 px-2.5 rounded-2xl"
              style={{
                color: active ? "hsl(var(--nav-active))" : "hsl(var(--nav-muted))",
                position: isCenter ? "relative" : undefined,
                top: isCenter ? "-20px" : undefined,
                minWidth: 0,
              }}
            >
              {isCenter ? (
                /* Floating center button — always the brand color, elevated above the bar */
                <div
                  className="w-[54px] h-[54px] rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: "linear-gradient(145deg, hsl(var(--nav-active)), hsl(var(--nav-active) / 0.75))",
                    color: "hsl(var(--nav-active-foreground))",
                    boxShadow: "0 0 0 6px hsl(var(--nav-active) / 0.12), 0 10px 22px hsl(var(--nav-active) / 0.4)",
                    border: "3px solid hsl(var(--card))",
                  }}
                >
                  <tab.icon size={22} strokeWidth={2.3} />
                </div>
              ) : (
                <>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{ background: active ? "hsl(var(--nav-active) / 0.12)" : "transparent" }}
                  >
                    <tab.icon size={19} strokeWidth={active ? 2.4 : 2} />
                  </div>
                  <span className="text-[9.5px] font-semibold tracking-wide">
                    {tab.label}
                  </span>
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
