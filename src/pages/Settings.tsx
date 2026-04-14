import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { store, BusinessProfile } from "@/lib/store";
import { Building2, Phone, Mail, MapPin, Moon, Sun, Save, Camera, DollarSign, HelpCircle, Shield, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<BusinessProfile>(store.getBusinessProfile());
  const [logoPreview, setLogoPreview] = useState<string>(profile.logo || "");

  useEffect(() => {
    if (profile.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [profile.darkMode]);

  const handleSave = () => {
    store.saveBusinessProfile({ ...profile, logo: logoPreview });
    toast({ title: "Settings Saved", description: "Business profile updated successfully." });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleDark = (checked: boolean) => {
    setProfile((p) => ({ ...p, darkMode: checked }));
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    store.saveBusinessProfile({ ...profile, darkMode: checked, logo: logoPreview });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Settings" showBack={false} />
      <div className="px-4 py-4 space-y-5">
        {/* Dark Mode Toggle */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile.darkMode ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
              <div>
                <p className="font-semibold text-sm">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
            </div>
            <Switch checked={profile.darkMode} onCheckedChange={toggleDark} />
          </div>
        </div>

        {/* Business Profile */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={18} className="text-primary" />
            <h2 className="font-bold text-sm">Business Profile</h2>
          </div>

          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Camera size={24} className="text-muted-foreground" />
              )}
            </div>
            <label className="text-xs text-primary font-semibold cursor-pointer">
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Building2 size={12} /> Company Name
              </Label>
              <Input value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} placeholder="Your Company Name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin size={12} /> Address
              </Label>
              <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Business Address" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Phone size={12} /> Phone
              </Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone Number" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Mail size={12} /> Email
              </Label>
              <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email Address" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <DollarSign size={12} /> Currency Symbol
              </Label>
              <Input value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} placeholder="$" className="w-24" />
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {[
            { icon: Bell, label: "Notifications", desc: "Manage alerts" },
            { icon: Shield, label: "Privacy & Security", desc: "App security settings" },
            { icon: HelpCircle, label: "Help & Support", desc: "FAQs and contact" },
          ].map((s) => (
            <button key={s.label} className="w-full p-4 flex items-center gap-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
              <s.icon size={18} className="text-primary" />
              <div className="text-left">
                <p className="font-semibold text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Save Button */}
        <button onClick={handleSave} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
          <Save size={16} /> Save Settings
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
