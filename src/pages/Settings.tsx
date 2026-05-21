import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store, BusinessProfile } from "@/lib/store";
import { Building2, Phone, Mail, MapPin, Moon, Sun, Save, Camera, DollarSign, HelpCircle, Shield, Bell, LogOut, Loader2, Wifi, WifiOff, Users, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { apiSignOut, apiGetBusinessProfile, apiSaveBusinessProfile, apiSendPushNotification, apiGet } from "@/lib/api";
import { loadAlertPrefs } from "@/lib/alert-notifications";
import { initializeMobilePush } from "@/lib/mobile-push";
import { useAppContext } from "@/hooks/use-app-context";
import { SecurityPrefs, loadSecurityPrefs, saveSecurityPrefs, hasPinSet, savePin, clearPin, verifyPin } from "@/lib/security";

type AlertPrefs = {
  lowStock: boolean;
  duePayments: boolean;
  salesSummary: boolean;
  pushEnabled: boolean;
};

type StaffUser = {
  id: number;
  name: string;
  email: string;
};

const ALERT_PREFS_KEY = "pos_alert_prefs";

const defaultAlertPrefs: AlertPrefs = loadAlertPrefs();

function loadPrefs<T>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return defaults;
  }
}

function savePrefs<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner, roleLabel } = useAppContext();
  const [profile, setProfile] = useState<BusinessProfile>(store.getBusinessProfile());
  const [logoPreview, setLogoPreview] = useState<string>(profile.logo || "");
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [alerts, setAlerts] = useState<AlertPrefs>(() => loadPrefs(ALERT_PREFS_KEY, defaultAlertPrefs));
  const [security, setSecurity] = useState<SecurityPrefs>(() => loadSecurityPrefs());
  const [pinSet, setPinSet] = useState(() => hasPinSet());
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinNew, setPinNew] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinFormError, setPinFormError] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pushTitle, setPushTitle] = useState("Test Push Alert");
  const [pushBody, setPushBody] = useState("This is a test notification from Settings.");
  const [pushSending, setPushSending] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const ownerEmail = (profile.email || "").trim();
  const ownerPhone = (profile.phone || "").trim();

  useEffect(() => {
    if (profile.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [profile.darkMode]);

  // Sync business profile from backend on mount (when online)
  useEffect(() => {
    const bp = store.getBusinessProfile();
    if (!bp.isOnline) return;
    apiGetBusinessProfile().then(data => {
      if (!data) return;
      store.applyBackendBusinessProfile(data);
      const updated = store.getBusinessProfile();
      setProfile(updated);
      setLogoPreview(updated.logo || "");
    }).catch(() => { /* offline or endpoint unavailable — keep local */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showPushDialog || !isOwner) return;

    const loadStaffUsers = async () => {
      setStaffLoading(true);
      try {
        const payload = await apiGet<{ data?: Array<{ id: number; name: string; email: string }> }>("/users");
        const users = Array.isArray(payload.data) ? payload.data : [];
        setStaffUsers(users.map((u) => ({ id: u.id, name: u.name, email: u.email })));
      } catch {
        setStaffUsers([]);
      } finally {
        setStaffLoading(false);
      }
    };

    void loadStaffUsers();
  }, [showPushDialog, isOwner]);

  const handleSave = () => {
    if (!isOwner) {
      toast({ title: "Permission required", description: "Only Shop Owner can update settings", variant: "destructive" });
      return;
    }
    const updated = { ...profile, logo: logoPreview };
    store.saveBusinessProfile(updated);
    if (updated.isOnline) {
      apiSaveBusinessProfile({
        company_name: updated.companyName,
        address: updated.address,
        phone: updated.phone,
        email: updated.email,
        logo: updated.logo,
      }).catch(() => { /* save locally; backend sync failed */ });
    }
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

  const toggleOnlineMode = (checked: boolean) => {
    setProfile((p) => ({ ...p, isOnline: checked }));
    store.saveBusinessProfile({ ...profile, isOnline: checked, logo: logoPreview });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiSignOut();
    } catch {
      // Token is cleared in apiSignOut's finally block regardless
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  };

  const updateAlerts = (next: AlertPrefs) => {
    setAlerts(next);
    savePrefs(ALERT_PREFS_KEY, next);
    void initializeMobilePush(next.pushEnabled).catch(() => undefined);
    if (next.pushEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  };

  const updateSecurity = (next: SecurityPrefs) => {
    setSecurity(next);
    saveSecurityPrefs(next);
  };

  const resetPinForm = () => {
    setShowPinForm(false);
    setPinNew(""); setPinConfirm(""); setPinCurrent(""); setPinFormError("");
  };

  const handleSetPin = async () => {
    if (pinNew.length < 4) { setPinFormError("PIN must be at least 4 digits."); return; }
    if (!/^\d+$/.test(pinNew)) { setPinFormError("PIN must contain only digits."); return; }
    if (pinNew !== pinConfirm) { setPinFormError("PINs do not match."); return; }
    if (pinSet && pinCurrent) {
      const ok = await verifyPin(pinCurrent);
      if (!ok) { setPinFormError("Current PIN is incorrect."); return; }
    }
    setPinSaving(true);
    try {
      await savePin(pinNew);
      setPinSet(true);
      resetPinForm();
      toast({ title: "PIN saved", description: "Lock screen PIN has been set." });
    } finally {
      setPinSaving(false);
    }
  };

  const handleRemovePin = () => {
    clearPin();
    setPinSet(false);
    toast({ title: "PIN removed", description: "Lock screen PIN has been cleared." });
  };

  const handleSendTestPush = async () => {
    if (!isOwner) {
      toast({ title: "Permission required", description: "Only Shop Owner can send push notifications", variant: "destructive" });
      return;
    }

    if (!pushTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    if (recipientMode === "selected" && selectedUserIds.length === 0) {
      toast({ title: "Select at least one staff user", variant: "destructive" });
      return;
    }

    setPushSending(true);
    try {
      const result = await apiSendPushNotification({
        title: pushTitle.trim(),
        body: pushBody.trim(),
        data: { source: "settings-test" },
        user_ids: recipientMode === "selected" ? selectedUserIds : undefined,
      });

      toast({
        title: "Push request sent",
        description: result
          ? `Delivered: ${result.success}, Failed: ${result.failure}, Tokens: ${result.total_tokens}`
          : "Push send request completed.",
      });
      setShowPushDialog(false);
      setRecipientMode("all");
      setSelectedUserIds([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send push notification";
      toast({ title: "Push send failed", description: message, variant: "destructive" });
    } finally {
      setPushSending(false);
    }
  };

  const toggleRecipient = (userId: number, checked: boolean) => {
    setSelectedUserIds((prev) => {
      if (checked) return [...new Set([...prev, userId])];
      return prev.filter((id) => id !== userId);
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Settings" showBack={false} />
      <div className="px-4 py-4 space-y-5">
        {!isOwner && (
          <div className="text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode. Only Shop Owner can change settings.
          </div>
        )}
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

        {/* Online/Offline Toggle */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile.isOnline ? <Wifi size={20} className="text-success" /> : <WifiOff size={20} className="text-warning" />}
              <div>
                <p className="font-semibold text-sm">Mode</p>
                <p className="text-xs text-muted-foreground">
                  {profile.isOnline ? "Online - sync with server" : "Offline - local mode"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {profile.isOnline ? "Online" : "Offline"}
              </span>
              <Switch checked={profile.isOnline} onCheckedChange={toggleOnlineMode} disabled={!isOwner} />
            </div>
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
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={!isOwner} />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Building2 size={12} /> Company Name
              </Label>
              <Input value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} placeholder="Your Company Name" disabled={!isOwner} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin size={12} /> Address
              </Label>
              <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Business Address" disabled={!isOwner} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Phone size={12} /> Phone
              </Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone Number" disabled={!isOwner} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Mail size={12} /> Email
              </Label>
              <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email Address" disabled={!isOwner} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <DollarSign size={12} /> Currency Symbol
              </Label>
              <Input value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} placeholder="$" className="w-24" disabled={!isOwner} />
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {[
            { icon: Bell, label: "Notifications", desc: "Manage alerts", onClick: () => setShowAlertDialog(true) },
            ...(isOwner ? [{ icon: Send, label: "Send Test Push", desc: "Broadcast test notification", onClick: () => setShowPushDialog(true) }] : []),
            { icon: Shield, label: "Privacy & Security", desc: "App security settings", onClick: () => setShowSecurityDialog(true) },
            ...(isOwner ? [{ icon: Users, label: "User Roles", desc: "Manage staff permissions", onClick: () => navigate("/user-roles") }] : []),
            { icon: HelpCircle, label: "Help & Support", desc: "FAQs and contact", onClick: () => setShowHelpDialog(true) },
          ].map((s) => (
            <button key={s.label} onClick={s.onClick} className="w-full p-4 flex items-center gap-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
              <s.icon size={18} className="text-primary" />
              <div className="text-left">
                <p className="font-semibold text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={!isOwner} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60">
          <Save size={16} /> Save Settings
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-destructive/10 text-destructive border border-destructive/20 rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>

      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Manage alerts</p>
            <PrefSwitch
              title="Low stock alerts"
              subtitle="Notify when product stock reaches alert level"
              checked={alerts.lowStock}
              onChange={(value) => updateAlerts({ ...alerts, lowStock: value })}
            />
            <PrefSwitch
              title="Due payment reminders"
              subtitle="Remind about customer/supplier dues"
              checked={alerts.duePayments}
              onChange={(value) => updateAlerts({ ...alerts, duePayments: value })}
            />
            <PrefSwitch
              title="Daily sales summary"
              subtitle="Send end-of-day summary"
              checked={alerts.salesSummary}
              onChange={(value) => updateAlerts({ ...alerts, salesSummary: value })}
            />
            <PrefSwitch
              title="Push notifications"
              subtitle="Allow push notifications in app"
              checked={alerts.pushEnabled}
              onChange={(value) => updateAlerts({ ...alerts, pushEnabled: value })}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSecurityDialog} onOpenChange={(open) => { setShowSecurityDialog(open); if (!open) resetPinForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy & Security</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">App security settings</p>
            <PrefSwitch
              title="App lock"
              subtitle="Require unlock when reopening app"
              checked={security.appLock}
              onChange={(value) => updateSecurity({ ...security, appLock: value })}
            />
            <PrefSwitch
              title="Biometric unlock"
              subtitle="Use fingerprint/face unlock when available"
              checked={security.biometric}
              onChange={(value) => updateSecurity({ ...security, biometric: value })}
            />
            <PrefSwitch
              title="Hide sensitive amounts"
              subtitle="Mask money values in overview cards"
              checked={security.hideAmounts}
              onChange={(value) => updateSecurity({ ...security, hideAmounts: value })}
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Auto lock timeout</Label>
              <Select
                value={security.autoLock}
                onValueChange={(value: SecurityPrefs["autoLock"]) => updateSecurity({ ...security, autoLock: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediately">Immediately</SelectItem>
                  <SelectItem value="1m">1 minute</SelectItem>
                  <SelectItem value="5m">5 minutes</SelectItem>
                  <SelectItem value="15m">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PIN Management */}
            <div className="space-y-2 pt-1 border-t border-border">
              <Label className="text-xs text-muted-foreground">Lock Screen PIN</Label>
              {!showPinForm ? (
                <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{pinSet ? "PIN is set" : "No PIN configured"}</p>
                    <p className="text-xs text-muted-foreground">
                      {pinSet ? "Required when biometric is unavailable" : "Set a PIN as lock screen fallback"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setShowPinForm(true)}
                      className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/10"
                    >
                      {pinSet ? "Change" : "Set PIN"}
                    </button>
                    {pinSet && (
                      <button
                        onClick={handleRemovePin}
                        className="text-xs font-semibold text-destructive px-3 py-1.5 rounded-lg border border-destructive/30 hover:bg-destructive/10"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  {pinSet && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Current PIN</Label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pinCurrent}
                        autoComplete="off"
                        onChange={(e) => { setPinCurrent(e.target.value.replace(/\D/g, "")); setPinFormError(""); }}
                        placeholder="Enter current PIN"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">New PIN (4–6 digits)</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pinNew}
                      autoComplete="new-password"
                      onChange={(e) => { setPinNew(e.target.value.replace(/\D/g, "")); setPinFormError(""); }}
                      placeholder="Enter new PIN"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Confirm PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pinConfirm}
                      autoComplete="new-password"
                      onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "")); setPinFormError(""); }}
                      placeholder="Confirm new PIN"
                    />
                  </div>
                  {pinFormError && <p className="text-xs text-destructive">{pinFormError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSetPin}
                      disabled={pinSaving}
                      className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg disabled:opacity-60"
                    >
                      {pinSaving ? "Saving..." : "Save PIN"}
                    </button>
                    <button
                      onClick={resetPinForm}
                      className="flex-1 border border-border text-xs font-semibold py-2 rounded-lg hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Push</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Shop Owner only. Sends a push notification to active tokens in this business.</p>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">Recipients</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode("all")}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${recipientMode === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                >
                  All Staff
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode("selected")}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${recipientMode === "selected" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                >
                  Selected Staff
                </button>
              </div>

              {recipientMode === "selected" && (
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-2">
                  {staffLoading && <p className="text-xs text-muted-foreground">Loading staff...</p>}
                  {!staffLoading && staffUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No staff users found.</p>
                  )}
                  {!staffLoading && staffUsers.map((user) => {
                    const checked = selectedUserIds.includes(user.id);
                    return (
                      <label key={user.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleRecipient(user.id, e.target.checked)}
                        />
                        <span>{user.name} ({user.email})</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Title</Label>
              <Input
                value={pushTitle}
                maxLength={120}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Message</Label>
              <Input
                value={pushBody}
                maxLength={250}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="Notification body"
              />
            </div>
            <button
              onClick={handleSendTestPush}
              disabled={pushSending}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {pushSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {pushSending ? "Sending..." : "Send Test Push"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Help & Support</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">FAQs and contact</p>
            <div className="space-y-2">
              <FaqItem
                question="How do I switch between online and offline mode?"
                answer="Open Settings and toggle the Mode switch. Online syncs with server, Offline keeps data local on this device."
              />
              <FaqItem
                question="Why is my dashboard not showing latest server data?"
                answer="Ensure online mode is enabled and your internet connection is active. Then reopen Dashboard to refresh live summary."
              />
              <FaqItem
                question="Who can edit business settings?"
                answer="Only Shop Owner can update business profile and mode settings. Staff and employees have view-only access."
              />
            </div>

            {!isOwner && (ownerEmail || ownerPhone) && (
              <div className="rounded-xl border border-border p-3 space-y-2">
                <p className="text-sm font-semibold">Shop Owner Contact</p>
                {ownerEmail && (
                  <button
                    onClick={() => window.open(`mailto:${ownerEmail}`, "_self")}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted"
                  >
                    Email: {ownerEmail}
                  </button>
                )}
                {ownerPhone && (
                  <button
                    onClick={() => window.open(`tel:${ownerPhone.replace(/\s+/g, "")}`, "_self")}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted"
                  >
                    Phone: {ownerPhone}
                  </button>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-sm font-semibold">Contact Support</p>
              <button
                onClick={() => window.open("mailto:info@intelinksolutions.com", "_self")}
                className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted"
              >
                Email: info@intelinksolutions.com
              </button>
              <button
                onClick={() => window.open("tel:+233204447505", "_self")}
                className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted"
              >
                Phone: +233 20 444 7505
              </button>
              <button
                onClick={() => window.open("https://intelinksolutions.com", "_blank")}
                className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted"
              >
                Website: intelinksolutions.com
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

const PrefSwitch = ({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const FaqItem = ({ question, answer }: { question: string; answer: string }) => (
  <div className="rounded-lg border border-border p-3">
    <p className="text-sm font-semibold">{question}</p>
    <p className="text-xs text-muted-foreground mt-1">{answer}</p>
  </div>
);

export default Settings;
