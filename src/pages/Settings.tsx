import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { User, Bell, Shield, HelpCircle, LogOut } from "lucide-react";

const settings = [
  { icon: User, label: "Profile" },
  { icon: Bell, label: "Notifications" },
  { icon: Shield, label: "Privacy & Security" },
  { icon: HelpCircle, label: "Help & Support" },
  { icon: LogOut, label: "Log Out" },
];

const Settings = () => (
  <div className="min-h-screen bg-background pb-20">
    <PageHeader title="Settings" showBack={false} />
    <div className="px-4 py-4 space-y-2">
      {settings.map((s) => (
        <button key={s.label} className="w-full bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
          <s.icon size={20} className="text-primary" />
          <span className="font-semibold text-sm">{s.label}</span>
        </button>
      ))}
    </div>
    <BottomNav />
  </div>
);

export default Settings;
