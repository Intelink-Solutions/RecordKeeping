import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { User, Bell, Shield, HelpCircle, LogOut, Tag, Layers, Ruler, Percent, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const settingSections = [
  {
    title: "Product Settings",
    items: [
      { icon: Layers, label: "Categories", path: "/categories", color: "#27ae60" },
      { icon: Tag, label: "Brands", path: "/brands", color: "#2980b9" },
      { icon: Ruler, label: "Units", path: "/units", color: "#e67e22" },
      { icon: Percent, label: "VAT Settings", path: "/vat-settings", color: "#8e44ad" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: User, label: "Profile", color: "#2c3e50" },
      { icon: Bell, label: "Notifications", color: "#f39c12" },
      { icon: Shield, label: "Privacy & Security", color: "#27ae60" },
      { icon: HelpCircle, label: "Help & Support", color: "#2980b9" },
    ],
  },
];

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Settings" showBack={false} />
      <div className="px-4 py-4 space-y-5">
        {settingSections.map(section => (
          <div key={section.title}>
            <h3 className="font-bold text-sm text-muted-foreground mb-2">{section.title}</h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
              {section.items.map(s => (
                <button key={s.label} onClick={() => s.path ? navigate(s.path) : undefined} className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + "15", color: s.color }}>
                    <s.icon size={16} />
                  </div>
                  <span className="font-medium text-sm flex-1 text-left">{s.label}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className="w-full bg-destructive/10 text-destructive font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4">
          <LogOut size={18} />
          Log Out
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
