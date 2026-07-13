import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, KeyRound, Loader2, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/AuthShell";
import { apiSendResetCode, apiVerifyResetCode, apiResetPassword } from "@/lib/api";
import { isValidEmail } from "@/lib/validators";

type Step = "email" | "code" | "password" | "done";

const inputIconWrap = "absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center pointer-events-none";

const gradientButtonStyle = { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.78))" };

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string>((location.state as { email?: string })?.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const subtitle =
    step === "email" ? "Reset your password" :
    step === "code" ? "Enter the code we emailed you" :
    step === "password" ? "Choose a new password" :
    "All set";

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!isValidEmail(trimmed)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiSendResetCode(trimmed.toLowerCase());
      toast({ title: "Code sent", description: res.message });
      setStep("code");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send reset code.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast({ title: "Please enter the code", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiVerifyResetCode(email.trim().toLowerCase(), code.trim());
      setStep("password");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired code.";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      toast({ title: "Password must be at least 4 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword(email.trim().toLowerCase(), password);
      setStep("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not reset password.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle={subtitle}>
      {step === "email" && (
        <form onSubmit={handleSendCode} className="space-y-5" noValidate>
          <p className="text-sm text-slate-500 -mt-1">
            Enter the email on your account and we'll send you a reset code.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="fp-email" className="text-sm font-bold text-slate-800">Email</Label>
            <div className="relative">
              <div className={inputIconWrap}>
                <Mail size={15} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <Input
                id="fp-email"
                type="email"
                placeholder="you@example.com"
                className="pl-11 h-12 rounded-xl border-slate-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                autoFocus
                disabled={loading}
                inputMode="email"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            style={gradientButtonStyle}
          >
            {loading ? (<><Loader2 size={16} className="animate-spin" /> Sending…</>) : (<>Send Reset Code <ArrowRight size={16} /></>)}
          </button>
          <Link to="/login" className="block text-center text-sm text-slate-400">← Back to login</Link>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-5" noValidate>
          <p className="text-sm text-slate-500 -mt-1">
            We sent a code to <span className="font-semibold text-slate-700">{email}</span>.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="fp-code" className="text-sm font-bold text-slate-800">Reset Code</Label>
            <Input
              id="fp-code"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              disabled={loading}
              maxLength={8}
              className="text-center text-2xl tracking-[0.35em] font-bold h-14 rounded-xl border-slate-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            style={gradientButtonStyle}
          >
            {loading ? (<><Loader2 size={16} className="animate-spin" /> Verifying…</>) : "Verify Code"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full text-slate-400 text-xs py-1.5"
          >
            ← Use a different email
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fp-password" className="text-sm font-bold text-slate-800">New Password</Label>
            <div className="relative">
              <div className={inputIconWrap}>
                <Lock size={15} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <Input
                id="fp-password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                className="pl-11 pr-10 h-12 rounded-xl border-slate-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
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
          <div className="space-y-1.5">
            <Label htmlFor="fp-confirm" className="text-sm font-bold text-slate-800">Confirm Password</Label>
            <div className="relative">
              <div className={inputIconWrap}>
                <KeyRound size={15} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <Input
                id="fp-confirm"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                className="pl-11 h-12 rounded-xl border-slate-200"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            style={gradientButtonStyle}
          >
            {loading ? (<><Loader2 size={16} className="animate-spin" /> Saving…</>) : "Reset Password"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 size={28} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <div>
            <p className="font-bold text-slate-800">Password reset!</p>
            <p className="text-sm text-slate-500 mt-1">You can now sign in with your new password.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
            style={gradientButtonStyle}
          >
            Back to Login <ArrowRight size={16} />
          </button>
        </div>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
