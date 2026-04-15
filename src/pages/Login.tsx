import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, Loader2, KeySquare, RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  apiLogin,
  apiGetProfile,
  apiGetBusinessProfile,
  apiSubmitOtp,
  apiResendOtp,
  OtpRequiredError,
  NetworkDownError,
  tokenStorage,
} from "@/lib/api";
import { setCurrentRole } from "@/lib/permissions";
import { store } from "@/lib/store";
import {
  saveOfflineCredential,
  verifyOfflineCredential,
  hasOfflineCredential,
  OFFLINE_TOKEN,
} from "@/lib/security";
import logo from "@/assets/logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Credential step ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // ── OTP step ──
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpMsg, setOtpMsg] = useState("");
  const [resending, setResending] = useState(false);

  // ── Shared ──
  const [loading, setLoading] = useState(false);

  // Already logged in — skip login screen
  if (tokenStorage.get()) {
    return <Navigate to="/home" replace />;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Password is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiLogin(email.trim().toLowerCase(), password);
      tokenStorage.set(res.data.token);
      store.applyBackendCurrency(res.data.currency);

      try {
        const profile = await apiGetProfile();
        setCurrentRole(profile.role || "staff");
        store.applyBackendUserProfile(profile);
        apiGetBusinessProfile().then(biz => { if (biz) store.applyBackendBusinessProfile(biz); }).catch(() => {});
      } catch {
        setCurrentRole("staff");
      }

      // Cache credentials for offline fallback (non-blocking).
      saveOfflineCredential(email, password).catch(() => {});

      navigate("/home", { replace: true });
    } catch (err) {
      if (err instanceof OtpRequiredError) {
        setOtpMsg(err.message);
        setOtpStep(true);
      } else if (err instanceof NetworkDownError && hasOfflineCredential()) {
        // Server is unreachable — try cached credential hash.
        const valid = await verifyOfflineCredential(email, password);
        if (valid) {
          tokenStorage.set(OFFLINE_TOKEN);
          const cachedProfile = store.getUserProfile();
          setCurrentRole(cachedProfile.role || "staff");
          toast({
            title: "Offline Mode",
            description: "Server unreachable. Signed in with cached credentials — some features may be unavailable.",
          });
          navigate("/home", { replace: true });
        } else {
          toast({
            title: "Offline – Cannot Sign In",
            description: "Server is unreachable and credentials don't match the cached ones. Try again when online.",
            variant: "destructive",
          });
        }
      } else {
        const msg = err instanceof Error ? err.message : "Login failed.";
        toast({ title: "Login Failed", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({ title: "Please enter the OTP", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiSubmitOtp(email.trim().toLowerCase(), otp.trim());
      tokenStorage.set(res.token);
      store.applyBackendCurrency(res.currency);

      try {
        const profile = await apiGetProfile();
        setCurrentRole(profile.role || "staff");
        store.applyBackendUserProfile(profile);
        apiGetBusinessProfile().then(biz => { if (biz) store.applyBackendBusinessProfile(biz); }).catch(() => {});
      } catch {
        setCurrentRole("staff");
      }

      navigate("/home", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OTP verification failed.";
      toast({ title: "OTP Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const res = await apiResendOtp(email.trim().toLowerCase());
      toast({ title: "OTP Resent", description: res.message });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend OTP.";
      toast({ title: "Resend Failed", description: msg, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="bg-primary pt-14 pb-12 px-6 flex flex-col items-center rounded-b-[2.5rem] relative overflow-hidden">
        {/* Decorative rings */}
        <div
          className="absolute rounded-full border-2 border-primary-foreground/10"
          style={{ width: 260, height: 260, top: -80, right: -80 }}
        />
        <div
          className="absolute rounded-full border-2 border-primary-foreground/10"
          style={{ width: 160, height: 160, bottom: -40, left: -40 }}
        />

        {/* Logo */}
        <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2.5 z-10 mb-4">
          <img
            src={logo}
            alt="Key Doctors POS"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        <h1 className="text-2xl font-extrabold text-primary-foreground z-10 tracking-tight">
          Key Doctors POS
        </h1>
        <p className="text-sm text-primary-foreground/65 mt-1 z-10">
          {otpStep ? "Verify your identity" : "Sign in to your account"}
        </p>
      </div>

      {/* ── Form area ── */}
      <div className="flex-1 px-6 py-8">
        {!otpStep ? (
          /* ── Credential form ── */
          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  disabled={loading}
                  inputMode="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-0.5"
                  tabIndex={-1}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        ) : (
          /* ── OTP form ── */
          <form onSubmit={handleOtpSubmit} className="space-y-5" noValidate>
            {/* Info banner */}
            <div className="bg-accent border border-border rounded-xl p-4 flex gap-3 items-start">
              <KeySquare
                size={18}
                className="text-accent-foreground shrink-0 mt-0.5"
              />
              <p className="text-sm text-accent-foreground leading-snug">
                {otpMsg}
              </p>
            </div>

            {/* OTP input */}
            <div className="space-y-1.5">
              <Label htmlFor="otp" className="text-sm font-semibold">
                One-Time Password
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
                disabled={loading}
                maxLength={8}
                className="text-center text-2xl tracking-[0.35em] font-bold h-14"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify OTP"
              )}
            </button>

            {/* Resend */}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending || loading}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground py-2 disabled:opacity-50"
            >
              <RotateCcw size={13} className={resending ? "animate-spin" : ""} />
              {resending ? "Sending…" : "Resend OTP"}
            </button>

            {/* Back */}
            <button
              type="button"
              onClick={() => {
                setOtpStep(false);
                setOtp("");
                setOtpMsg("");
              }}
              className="w-full text-muted-foreground text-xs py-1.5"
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>

      {/* ── Footer ── */}
      <p className="text-center text-xs text-muted-foreground pb-8 px-6">
        © {new Date().getFullYear()} Key Doctors Solutions. All rights reserved.
      </p>
    </div>
  );
};

export default Login;
