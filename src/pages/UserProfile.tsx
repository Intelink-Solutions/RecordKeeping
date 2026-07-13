import { useEffect, useState } from "react";
import { Camera, Mail, Phone, Save, ShieldUser, User, LogOut, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { store, UserProfile as UserProfileModel } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { apiGetProfile, apiSaveUserProfile, apiSignOut } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { validateOptionalEmail, validateOptionalPhone } from "@/lib/validators";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner, roleLabel } = useAppContext();
  const [profile, setProfile] = useState<UserProfileModel>(store.getUserProfile());
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const isOnline = store.getBusinessProfile().isOnline;
    if (!isOnline) return;
    apiGetProfile().then((data) => {
      store.applyBackendUserProfile(data);
      setProfile(store.getUserProfile());
    }).catch(() => { /* keep local profile if backend is unavailable */ });
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!isOwner) {
      toast({ title: "Permission required", description: "Only Shop Owner can edit profile", variant: "destructive" });
      return;
    }
    const emailError = validateOptionalEmail(profile.email);
    if (emailError) { toast({ title: emailError, variant: "destructive" }); return; }
    const phoneError = validateOptionalPhone(profile.phone);
    if (phoneError) { toast({ title: phoneError, variant: "destructive" }); return; }
    store.saveUserProfile(profile);
    if (store.getBusinessProfile().isOnline) {
      apiSaveUserProfile({
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        image: profile.avatar,
        bio: profile.bio,
      }).catch(() => { /* local save already completed */ });
    }
    toast({ title: "Profile Updated", description: "Your user profile has been saved." });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiSignOut();
    } catch {
      // Token is cleared in apiSignOut's finally block; continue logout flow.
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="User Profile" showBack={true} />

      <div className="px-4 py-4 space-y-5">
        {!isOwner && (
          <div className="text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode. Only Shop Owner can edit profile.
          </div>
        )}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="User avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">{getInitials(profile.fullName)}</span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md">
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={!isOwner} />
              </label>
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">{profile.fullName || "User Profile"}</p>
              <p className="text-sm text-muted-foreground">{profile.role || "Role not set"}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <User size={12} /> Full Name
            </Label>
            <Input
              value={profile.fullName}
              onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Your full name"
                disabled={!isOwner}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Mail size={12} /> Email
            </Label>
            <Input
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com"
                disabled={!isOwner}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Phone size={12} /> Phone
            </Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone number"
                disabled={!isOwner}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <ShieldUser size={12} /> Role
            </Label>
            <Input
              value={profile.role}
              onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
              placeholder="e.g. Administrator"
                disabled={!isOwner}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Bio</Label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Short description about you"
              rows={4}
              disabled={!isOwner}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isOwner}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
        >
          <Save size={16} /> Save Profile
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-destructive/10 text-destructive border border-destructive/20 rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default UserProfile;