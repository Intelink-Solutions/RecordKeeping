import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { store } from "@/lib/store";
import { apiSaveBusinessProfile } from "@/lib/api";
import { showSaved, emitStoreUpdate } from "@/hooks/use-live-data";
import { isValidPhone } from "@/lib/validators";
import { DEFAULT_APP_NAME, SETUP_WIZARD_SKIP_KEY } from "@/lib/app-branding";

/**
 * First-login onboarding: prompts the shop owner to set a short app name,
 * shop icon, phone, and address. Shown on Home whenever the owner hasn't set
 * a `shortName` yet (the wizard is the only place that sets it, so its
 * presence reliably means setup was completed at least once). Skippable —
 * dismissing only sets a sessionStorage flag, so it reappears next login
 * (Login.tsx clears the flag on every successful sign-in).
 */
const SetupWizard = () => {
  const { toast } = useToast();
  const { isOwner } = useAppContext();
  const profile = store.getBusinessProfile();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SETUP_WIZARD_SKIP_KEY) === "1");
  const [companyName, setCompanyName] = useState(profile.companyName === DEFAULT_APP_NAME ? "" : profile.companyName);
  const [shortName, setShortName] = useState(profile.shortName);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);
  const [logoPreview, setLogoPreview] = useState(profile.logo || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const needsSetup = isOwner && !profile.shortName?.trim();
  const open = needsSetup && !dismissed;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSkip = () => {
    sessionStorage.setItem(SETUP_WIZARD_SKIP_KEY, "1");
    setDismissed(true);
  };

  const handleSave = async () => {
    if (!shortName.trim()) {
      toast({ title: "Short app name is required", variant: "destructive" });
      return;
    }
    if (!logoPreview) {
      toast({ title: "Please upload a shop icon", variant: "destructive" });
      return;
    }
    if (!phone.trim() || !isValidPhone(phone)) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    if (!address.trim()) {
      toast({ title: "Address is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const updated = {
        ...profile,
        shortName: shortName.trim(),
        companyName: companyName.trim() || shortName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        logo: logoPreview,
      };
      store.saveBusinessProfile(updated);
      // Only push to the backend when we know the real business id — without
      // it, apiSaveBusinessProfile falls back to the *create* endpoint, and
      // this account already has a business, so that would just create a
      // duplicate. businessId is set by the login-time profile sync; if it's
      // somehow still missing here, the local save above already covers the
      // in-app experience and a later sync will fill it in.
      if (updated.isOnline && updated.businessId) {
        await apiSaveBusinessProfile({
          businessId: updated.businessId,
          company_name: updated.companyName,
          address: updated.address,
          phone: updated.phone,
          logoFile: logoFile ?? undefined,
        }).catch(() => undefined);
      }
      emitStoreUpdate();
      showSaved("App set up! Welcome to your dashboard.");
      setDismissed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save your setup — please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="w-full max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Up Your App</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Personalize the app with your shop's name and icon — takes a minute.
        </p>
        <div className="space-y-4 mt-1">
          <div className="flex flex-col items-center gap-2">
            <label className="relative w-20 h-20 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Shop icon preview" className="w-full h-full object-contain p-1" />
              ) : (
                <Camera size={22} className="text-muted-foreground" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={saving} />
            </label>
            <span className="text-xs text-muted-foreground">Shop icon *</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-short-name" className="text-sm font-semibold">Short App Name *</Label>
            <Input
              id="setup-short-name"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. My RECORD APP"
              maxLength={24}
              disabled={saving}
            />
            <p className="text-[11px] text-muted-foreground">Shown as your app name after you sign in.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-business-name" className="text-sm font-semibold">Business Name</Label>
            <Input
              id="setup-business-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Full business name (optional)"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-phone" className="text-sm font-semibold">Phone *</Label>
            <Input
              id="setup-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Shop phone number"
              inputMode="tel"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-address" className="text-sm font-semibold">Address *</Label>
            <Textarea
              id="setup-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop address"
              rows={2}
              disabled={saving}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleSkip} className="flex-1" disabled={saving}>
              Skip for now
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Finish Setup"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SetupWizard;
