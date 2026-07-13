import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, Loader2, KeySquare, RotateCcw, ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/AuthShell";
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
import { isValidEmail } from "@/lib/validators";
import { SETUP_WIZARD_SKIP_KEY } from "@/lib/app-branding";

const inputIconWrap = "absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center pointer-events-none";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Credential step ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Password is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiLogin(email.trim().toLowerCase(), password);
      if (!res?.data?.token) {
        throw new Error(res?.message || "Server returned an unexpected response. You may be blocked by bot protection.");
      }
      tokenStorage.set(res.data.token, rememberMe);
      store.applyBackendCurrency(res.data.currency);

      try {
        const profile = await apiGetProfile();
        setCurrentRole(profile.role || "staff");
        store.applyBackendUserProfile(profile);
        if (profile.id) store.setCurrentUserId(profile.id);
        apiGetBusinessProfile().then(biz => { if (biz) store.applyBackendBusinessProfile(biz); }).catch(() => {});
      } catch {
        setCurrentRole("staff");
      }

      // Cache credentials for offline fallback (non-blocking).
      saveOfflineCredential(email, password).catch(() => {});

      sessionStorage.removeItem(SETUP_WIZARD_SKIP_KEY);
      navigate("/home", { replace: true });
    } catch (err) {
      if (err instanceof OtpRequiredError) {
        setOtpMsg(err.message);
        setOtpStep(true);
      } else if (err instanceof NetworkDownError && hasOfflineCredential()) {
        // Server is unreachable — try cached credential hash.
        const valid = await verifyOfflineCredential(email, password);
        if (valid) {
          tokenStorage.set(OFFLINE_TOKEN, rememberMe);
          const cachedProfile = store.getUserProfile();
          setCurrentRole(cachedProfile.role || "staff");
          toast({
            title: "Offline Mode",
            description: "Server unreachable. Signed in with cached credentials — some features may be unavailable.",
          });
          sessionStorage.removeItem(SETUP_WIZARD_SKIP_KEY);
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
      tokenStorage.set(res.token, rememberMe);
      store.applyBackendCurrency(res.currency);

      try {
        const profile = await apiGetProfile();
        setCurrentRole(profile.role || "staff");
        store.applyBackendUserProfile(profile);
        if (profile.id) store.setCurrentUserId(profile.id);
        apiGetBusinessProfile().then(biz => { if (biz) store.applyBackendBusinessProfile(biz); }).catch(() => {});
      } catch {
        setCurrentRole("staff");
      }

      sessionStorage.removeItem(SETUP_WIZARD_SKIP_KEY);
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
    <AuthShell subtitle={otpStep ? "Verify your identity" : "Sign in to your account"}>
      {!otpStep ? (
        /* ── Credential form ── */
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-bold text-slate-800">
              Email
            </Label>
            <div className="relative">
              <div className={inputIconWrap}>
                <Mail size={15} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-11 h-12 rounded-xl border-slate-200"
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
            <Label htmlFor="password" className="text-sm font-bold text-slate-800">
              Password
            </Label>
            <div className="relative">
              <div className={inputIconWrap}>
                <Lock size={15} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                className="pl-11 pr-10 h-12 rounded-xl border-slate-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
                tabIndex={-1}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me / Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
                disabled={loading}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              state={{ email: email.trim() }}
              className="text-sm font-medium"
              style={{ color: "hsl(var(--primary))" }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))" }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        /* ── OTP form ── */
        <form onSubmit={handleOtpSubmit} className="space-y-5" noValidate>
          {/* Info banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
            <KeySquare
              size={18}
              className="shrink-0 mt-0.5"
              style={{ color: "hsl(var(--primary))" }}
            />
            <p className="text-sm text-slate-700 leading-snug">
              {otpMsg}
            </p>
          </div>

          {/* OTP input */}
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="text-sm font-bold text-slate-800">
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
              className="text-center text-2xl tracking-[0.35em] font-bold h-14 rounded-xl border-slate-200"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))" }}
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
            className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 py-2 disabled:opacity-50"
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
            className="w-full text-slate-400 text-xs py-1.5"
          >
            ← Back to login
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default Login;
